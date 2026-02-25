/**
 * Initializes a Pinecone index for semantic product search.
 *
 * Creates a new index named 'developer-quickstart-js' with the Llama text embedding model
 * if it doesn't already exist. The index is configured to run on AWS in the us-east-1 region.
 *
 * @async
 * @function bootstrap
 * @returns {Promise<void>}
 * @throws {Error} Logs errors to console if index creation fails (unless index already exists)
 *
 * @remarks
 * - Requires PINECONE_API_KEY environment variable to be set
 * - If the index already exists, the function logs a message and continues without error
 * - Uses the 'chunk_text' field for document text content
 * - Source: https://sdk.pinecone.io/typescript/
 */
//

import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const indexName = process.env.PINECONE_INDEX_NAME;
  const region = process.env.PINECONE_REGION;
  const cloud = process.env.PINECONE_CLOUD;
  // create a serverless index
  try {
    await pc.createIndex({
      name: indexName,
      dimension: 1536,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud,
          region,
        },
      },
    });
    console.log(`[PINECONE]Created index: "${indexName}"`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('already exists')) {
      console.log(
        `[PINECONE]Index "${indexName}" already exists, skipping creation.`,
      );
    } else {
      console.error(`[PINECONE]Error creating index:`, err);
    }
  }
}

bootstrap();
