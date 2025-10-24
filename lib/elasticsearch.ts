import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";

dotenv.config();

const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_HOSTS || "http://localhost:9200",
});

export const createIndex = async (indexName: string) => {
  const indexExists = await elasticsearchClient.indices.exists({
    index: indexName,
  });
  if (!indexExists) {
    await elasticsearchClient.indices.create({ index: indexName });
    console.log(`Index "${indexName}" created.`);
  }
};

export const indexEmail = async (indexName: string, email: any) => {
  await elasticsearchClient.index({
    index: indexName,
    body: email,
  });
};
