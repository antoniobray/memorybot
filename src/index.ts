/* eslint-disable no-await-in-loop */
import dotenv from 'dotenv';
import { OpenAIChat } from 'langchain/llms/openai';
// eslint-disable-next-line import/no-unresolved
import * as readline from 'node:readline/promises';
import path from 'path';
import fs from 'fs';
/* This line of code is importing the `stdin` and `stdout` streams from the `process` module in
Node.js. These streams are used for reading input from the user and writing output to the console,
respectively. */
import { stdin as input, stdout as output } from 'node:process';
import { CallbackManager } from 'langchain/callbacks';
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts';
import { RunnableSequence } from "langchain/schema/runnable";
import { AgentExecutor } from "langchain/agents";
import { AgentStep, BaseMessage } from "langchain/schema";
import { ReActSingleInputOutputParser } from "langchain/agents/react/output_parser";
import { oneLine } from 'common-tags';
import chalk from 'chalk';
import logChat from './chatLogger.js';
import createCommandHandler from './commands.js';
import { getMemoryVectorStore, addDocumentsToMemoryVectorStore, getBufferWindowMemory } from './lib/memoryManager.js';
import { getRelevantContext } from './lib/vectorStoreUtils.js';
import sanitizeInput from './utils/sanitizeInput.js';
import { getConfig, getProjectRoot } from './config/index.js';
import { Serper } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';
import { renderTextDescription } from 'langchain/tools/render';
import { formatLogToString } from 'langchain/agents/format_scratchpad/log';

const projectRootDir = getProjectRoot();

dotenv.config();

// Set up the chat log directory
const chatLogDirectory = path.join(projectRootDir, 'chat_logs');

// Get the prompt template
const systemPromptTemplate = fs.readFileSync(path.join(projectRootDir, 'src/prompt.txt'), 'utf8');

// Set up the readline interface to read input from the user and write output to the console
const rl = readline.createInterface({ input, output });

// Set up CLI commands
const commandHandler: CommandHandler = createCommandHandler();

const callbackManager = CallbackManager.fromHandlers({
  // This function is called when the LLM generates a new token (i.e., a prediction for the next word)
  async handleLLMNewToken(token: string) {
    // Write the token to the output stream (i.e., the console)
    output.write(token);
  },
});

const llm = new OpenAIChat({
  streaming: true,
  callbackManager,
  modelName: process.env.MODEL || 'gpt-3.5-turbo',
});
const modelWithStop = llm.bind({
  stop: ["\nObservation"],
});

const systemPrompt = SystemMessagePromptTemplate.fromTemplate(oneLine`
  ${systemPromptTemplate}
`);

const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  systemPrompt,
  HumanMessagePromptTemplate.fromTemplate('QUESTION: """{input}"""'),
]);

const windowMemory = getBufferWindowMemory();

// const chain = new LLMChain({
//   prompt: chatPrompt,
//   memory: windowMemory,
//   llm,
// });


const tools = [
  new Serper(process.env.SERPER_API_KEY, {
    hl: "en",
  }),
  new Calculator(),
];

const toolNames = tools.map((tool) => tool.name);
const promptWithInputs = await chatPrompt.partial({
  tools: renderTextDescription(tools),
  tool_names: toolNames.join(","),
});

const runnableAgent = RunnableSequence.from([
  {
    input: (i: {
      input: string;
      history: string;
      steps: AgentStep[];
      chat_history: BaseMessage[];
    }) => i.input,
    agent_scratchpad: (i: {
      input: string;
      history: string;
      steps: AgentStep[];
      chat_history: BaseMessage[];
    }) => formatLogToString(i.steps),
    history: (i: {
      input: string;
      history: string;
      steps: AgentStep[];
      chat_history: BaseMessage[];
    }) => i.history,
    chat_history: (i: {
      input: string;
      history: string;
      steps: AgentStep[];
      chat_history: BaseMessage[];
    }) => i.chat_history,
  },
  promptWithInputs,
  modelWithStop,
  new ReActSingleInputOutputParser({ toolNames }),
]);
const executor = AgentExecutor.fromAgentAndTools({
  agent: runnableAgent,
  tools,
  memory: windowMemory,
  verbose: false
});


// eslint-disable-next-line no-constant-condition
while (true) {
  output.write(chalk.green('\nStart chatting or type /help for a list of commands\n'));
  const userInput = await rl.question('> ');
  let response;
  if (userInput.startsWith('/')) {
    const [command, ...args] = userInput.slice(1).split(' ');
    await commandHandler.execute(command, args, output);
  } else {
    const memoryVectorStore = await getMemoryVectorStore();

    const question = sanitizeInput(userInput);
    const config = getConfig();
    const history = await getRelevantContext(memoryVectorStore, question, config.numMemoryDocumentsToRetrieve);

    try {

      response = await executor.call({
        input: question,
        history,
      })

      if (response) {
        await addDocumentsToMemoryVectorStore([
          { content: question, metadataType: 'question' },
          { content: response.output, metadataType: 'answer' },
        ]);
        await logChat(chatLogDirectory, question, response.output);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cancel:')) {
        // TODO: Handle cancel
      } else if (error instanceof Error) {
        output.write(chalk.red(error.message));
      } else {
        output.write(chalk.red(error));
      }
    }
  }
  output.write('\n');
}
