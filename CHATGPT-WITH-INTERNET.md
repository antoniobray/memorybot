## Answer questions using Chatgpt + Internet

#### Steps
- Modify the prompt to add functionality of tools as well as the method to use tools

#### NOTE: The following changes are done in src/index.ts
- Create a list of tools. For now, only Serper
- Append the tool names and their descriptions into our prmopt template
- Create a runnable sequence using the prompt with inputs and model
- Use the runnable sequence to create an AgentExecutor. This has access to short term memory
- Output is a JSON with the reponse in `output` key