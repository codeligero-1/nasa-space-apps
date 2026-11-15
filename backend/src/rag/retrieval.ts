/**
 * RAG Retrieval Service for PET AI
 * Retrieves relevant health records using vector similarity search
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings.js';
import type { HealthRecord } from '../db/schema.js';

interface RetrievalOptions {
  astronautId: string;
  query: string;
  k?: number;
  types?: HealthRecord['type'][];
  includeBaselines?: boolean;
  db?: any;
  supabaseClient?: any;
}

interface RetrievedRecord extends HealthRecord {
  similarity?: number;
}

/**
 * Retrieve relevant health records using pgvector similarity search (Supabase)
 */
export async function retrieveWithPgvector(options: RetrievalOptions): Promise<RetrievedRecord[]> {
  const {
    astronautId,
    query,
    k = 10,
    types,
    includeBaselines = true
  } = options;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Build the query
  let queryBuilder = supabase
    .from('health_records')
    .select('*')
    .eq('astronaut_id', astronautId)
    .order('recorded_at', { ascending: false });

  // Filter by type if specified
  if (types && types.length > 0) {
    const validTypes = includeBaselines
      ? [...types, 'baseline']
      : types;
    queryBuilder = queryBuilder.in('type', validTypes);
  } else if (!includeBaselines) {
    queryBuilder = queryBuilder.not('type', 'eq', 'baseline');
  }

  // Execute vector similarity search using RPC
  // Note: This requires a custom RPC function in Supabase
  // For now, we'll fetch all and sort in memory (fallback)
  const { data: records, error } = await queryBuilder.limit(100);

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  if (!records || records.length === 0) {
    return [];
  }

  // Compute cosine similarity in memory (fallback)
  // In production, use pgvector's <=> operator via RPC
  const scoredRecords: RetrievedRecord[] = records
    .filter(r => r.embedding)
    .map(record => {
      const embedding = typeof record.embedding === 'string'
        ? JSON.parse(record.embedding)
        : record.embedding;

      if (!embedding || embedding.length === 0) {
        return { ...record, similarity: 0 };
      }

      const similarity = cosineSimilarity(queryEmbedding, embedding);
      return { ...record, similarity };
    })
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, k);

  return scoredRecords;
}

/**
 * Retrieve relevant health records from SQLite (local development)
 */
export async function retrieveWithSQLite(
  db: any,
  options: RetrievalOptions
): Promise<RetrievedRecord[]> {
  const {
    astronautId,
    query,
    k = 10,
    types,
    includeBaselines = true
  } = options;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Build SQL query
  let sql = `
    SELECT * FROM health_records
    WHERE astronaut_id = ?
  `;

  const params: any[] = [astronautId];

  if (types && types.length > 0) {
    const validTypes = includeBaselines
      ? [...types, 'baseline']
      : types;
    sql += ` AND type IN (${validTypes.map(() => '?').join(',')})`;
    params.push(...validTypes);
  } else if (!includeBaselines) {
    sql += ` AND type != 'baseline'`;
  }

  sql += ` ORDER BY recorded_at DESC LIMIT 100`;

  const rows = db.exec(sql, params);

  if (!rows || rows.length === 0 || !rows[0].values.length) {
    return [];
  }

  const columns = rows[0].columns;
  const records: RetrievedRecord[] = rows[0].values.map((row: any[]) => {
    const record: any = {};
    columns.forEach((col: string, i: number) => {
      record[col] = row[i];
    });
    return record;
  });

  // Compute cosine similarity in memory
  return records
    .filter(r => r.embedding)
    .map(record => {
      const embedding = typeof record.embedding === 'string'
        ? JSON.parse(record.embedding)
        : record.embedding;

      if (!embedding || embedding.length === 0) {
        return { ...record, similarity: 0 };
      }

      const similarity = cosineSimilarity(queryEmbedding, embedding);
      return { ...record, similarity };
    })
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, k);
}

/**
 * Main retrieval function - automatically detects environment
 */
export async function retrieveRelevantRecords(
  options: RetrievalOptions & { db?: any; supabaseClient?: any }
): Promise<RetrievedRecord[]> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && options.supabaseClient) {
    return retrieveWithPgvector({ ...options, supabaseClient: options.supabaseClient });
  }

  if (options.db) {
    return retrieveWithSQLite(options.db, options);
  }

  throw new Error('No database client provided for retrieval');
}

/**
 * Build context string from retrieved records for LLM
 */
export function buildContext(records: RetrievedRecord[]): string {
  if (!records.length) {
    return 'No relevant health records found.';
  }

  const sections: string[] = ['RELEVANT HEALTH RECORDS:'];

  for (const record of records) {
    const data = JSON.parse(record.data);
    const date = new Date(record.recorded_at).toLocaleDateString();
    const similarity = record.similarity ? ` (relevance: ${(record.similarity * 100).toFixed(1)}%)` : '';

    sections.push(`
--- Record ${record.id}${similarity} ---
Type: ${record.type}
Date: ${date}
Data: ${JSON.stringify(data, null, 2)}
    `.trim());
  }

  return sections.join('\n\n');
}

/**
 * Filter records by type
 */
export function filterByType(
  records: HealthRecord[],
  types: HealthRecord['type'][]
): HealthRecord[] {
  return records.filter(r => types.includes(r.type));
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}