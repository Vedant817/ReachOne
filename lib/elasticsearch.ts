/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@elastic/elasticsearch";

export const createClient = (elasticsearchHosts: string) => {
  return new Client({ node: elasticsearchHosts });
};

export const createIndex = async (
  indexName: string,
  client: any,
) => {
  const indexExists = await client.indices.exists({
    index: indexName,
  });
  if (!indexExists) {
    await client.indices.create({ index: indexName });
    console.log(`Index "${indexName}" created.`);
  }
};

export const indexEmail = async (indexName: string, email: any, client: any) => {
  await client.index({
    index: indexName,
    body: email,
  });
};
