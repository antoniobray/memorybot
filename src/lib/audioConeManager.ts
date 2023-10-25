import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import * as dotenv from "dotenv";

dotenv.config()

async function loadAudioConeVectorStore(): Promise<PineconeStore> {
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
        environment: process.env.PINECONE_ENVIRONMENT!,
    });


    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
    
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings({ maxConcurrency: 5 }),
      { pineconeIndex }
    );


    return vectorStore;
}

const audioConeVectorStore = await loadAudioConeVectorStore();

const audioConeWrapper = {
    audioConeInstance: audioConeVectorStore
}

async function getAudioConeVectorStore() {
    return audioConeWrapper.audioConeInstance;
}

export { getAudioConeVectorStore };