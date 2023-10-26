# PineCone Integration
The process is same to connect any vectordb within this repo but we will focus on connecting pinecone with memorybot

## Steps
- Create a new vectordb manager file in lib/* . For this example, audioConeManager is created
- Add logic for creating, loading vectordb using the connection steps (Refer to langchain documentation for this)
Also add a getter for vectorstore
- In lib/vectorDbUtils.ts, append the type of vectorStore to accept this newly connected db. In this case, PineconeStore is added
- In globals.d.ts, append the config object. this will let the method know the number of embeddings to find from the vectorStore
- In config/index.ts, add the number that will denote the number of embeddings to return
- In src/index.ts file, call the getter method for vectorstore. Call getRelevantContext passing the vectorstore and query. This will return k number of embeddings(This number is set in config/index.ts file)