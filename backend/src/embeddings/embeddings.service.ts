import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import appConfig from 'src/config/app.config';
import { GetEmbeddingsInput } from './inputs/get-embeddins.input';
import { ProviderItem } from 'src/csv/types/provider-item.type';
import { EmbeddingGenerationException } from './exceptions/embedding-generation.exception';

@Injectable()
export class EmbeddingsService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: appConfig().embeddings.apiKey,
    });
  }

  private isOpenAIError(
    err: unknown,
  ): err is { status?: number; code?: string; response?: { status?: number } } {
    return (
      typeof err === 'object' &&
      err !== null &&
      ('status' in err || 'code' in err || 'response' in err)
    );
  }

  async getEmbeddings(input: GetEmbeddingsInput): Promise<number[]> {
    if (!input?.text || input.text.trim() === '') {
      throw new EmbeddingGenerationException(
        'Embedding input text is empty',
        false,
        400,
      );
    }

    try {
      const response = await this.client.embeddings.create({
        model: appConfig().embeddings.model,
        input: input.text,
        dimensions: 1536,
        encoding_format: 'float',
      });

      const embedding = response?.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw new EmbeddingGenerationException(
          'Invalid embedding response structure',
          false,
        );
      }

      return embedding;
    } catch (error: unknown) {
      let message = 'Unknown embedding error';
      let status: number | undefined;
      let code: string | undefined;
      let retryable = false;

      if (error instanceof Error) {
        message = error.message;
      }

      if (this.isOpenAIError(error)) {
        status = error.status ?? error.response?.status;
        code = error.code;
      }

      // Clasificación correcta de retryable
      if (status === 429)
        retryable = true; // rate limit
      else if (status && status >= 500 && status < 600)
        retryable = true; // server error
      else if (
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND'
      )
        retryable = true; // network error

      // NO retryable
      if (status === 401 || status === 403) retryable = false; // auth
      if (status === 400 || status === 404) retryable = false; // bad input / model

      throw new EmbeddingGenerationException(message, retryable, status);
    }
  }

  buildItemEmbeddingText(item: ProviderItem): string {
    // avoid blank spaces and newlines, to save tokens
    const parts = [
      `Name: ${item.name}`,
      `Description: ${item.description}`,
      `Category: ${item.category}`,
    ];

    // now check the optional fields and add them to the text if they exist
    if (item.tags) parts.push(`Tags: ${item.tags}`);
    if (item.brand) parts.push(`Brand: ${item.brand}`);
    if (item.color) parts.push(`Color: ${item.color}`);
    if (item.size) parts.push(`Size: ${item.size}`);
    if (item.material) parts.push(`Material: ${item.material}`);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  async buildRequirementItemEmbeddingText() {}
}
