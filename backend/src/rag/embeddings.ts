/**
 * Embedding Service for PET AI RAG
 * Uses NVIDIA NIM embedding model (nemotron-3-embed-1b, 2048 dimensions) via OpenAI-compatible API
 */

import 'dotenv/config';
import type { HealthRecord } from '../db/schema.js';

const EMBEDDING_MODEL = process.env.NVIDIA_NIM_EMBEDDING_MODEL || 'nvidia/nemotron-3-embed-1b';
const EMBEDDING_DIMENSIONS = 2048; // nemotron-3-embed-1b produces 2048-dimensional embeddings
const NVIDIA_NIM_API_URL = process.env.NVIDIA_NIM_API_URL || 'https://integrate.api.nvidia.com/v1';

function getApiKey(): string {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY environment variable is required');
  }
  return apiKey;
}

/**
 * Generate embedding for a text string via NVIDIA NIM OpenAI-compatible API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = getApiKey();
  const response = await fetch(`${NVIDIA_NIM_API_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;

  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected embedding dimension ${EMBEDDING_DIMENSIONS}, got ${embedding?.length || 0}`);
  }

  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = getApiKey();

  const results = await Promise.all(
    texts.map(async (text) => {
      const response = await fetch(`${NVIDIA_NIM_API_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embedding API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;

      if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Expected embedding dimension ${EMBEDDING_DIMENSIONS}, got ${embedding?.length || 0}`);
      }

      return embedding;
    })
  );

  return results;
}

/**
 * Create embedding text from a health record
 * Combines record type, metrics, and recorded date for semantic search
 */
function healthRecordToEmbeddingText(record: HealthRecord): string {
  const data = JSON.parse(record.data);
  const metricNames = Object.keys(data).join(', ');
  const recordedDate = new Date(record.recorded_at).toLocaleDateString();

  return `
Record Type: ${record.type}
Metrics: ${metricNames}
Recorded: ${recordedDate}
Values: ${JSON.stringify(data)}
  `.trim();
}

/**
 * Generate embedding for a single health record
 */
export async function embedHealthRecord(record: HealthRecord): Promise<number[]> {
  const text = healthRecordToEmbeddingText(record);
  return generateEmbedding(text);
}

/**
 * Generate embeddings for multiple health records
 */
export async function embedHealthRecords(records: HealthRecord[]): Promise<number[][]> {
  const texts = records.map(healthRecordToEmbeddingText);
  return generateEmbeddings(texts);
}

/**
 * Store embedding in database (Supabase or SQLite)
 */
export async function storeEmbedding(
  supabaseClient: any,
  recordId: string,
  embedding: number[]
): Promise<void> {
  const embeddingJson = JSON.stringify(embedding);

  // Try Supabase first
  if (supabaseClient) {
    try {
      await supabaseClient
        .from('health_records')
        .update({ embedding: embeddingJson })
        .eq('id', recordId);
      return;
    } catch (error) {
      console.warn('[embeddings] Supabase update failed, will try SQLite:', error);
    }
  }

  // For SQLite, we'd need a different approach
  // This is handled in the generate-embeddings script
  throw new Error('No database client available for embedding storage');
}

/**
 * Get embedding dimension
 */
export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}