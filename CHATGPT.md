## Answer like a normal CHATGPT 

#### Steps
- Modify the prompt to discard data from documents. Chatgpt doesn't need access to documents in order to function
- Changed index.ts file to remove documents retrieval and passing it to the LLMchain (Ref. src/index.ts)
- Ensure short term and long term context are correctly being provided and handled in the prompt as well as when providing it to LLMChain (Ref. src/index.ts)