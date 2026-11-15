import { getDb } from '../db/connection.js';

async function checkKB() {
  const db = await getDb();
  const result = db.exec(
    "SELECT id, type, astronaut_id, embedding IS NOT NULL as has_embedding, LENGTH(embedding) as emb_length FROM health_records WHERE astronaut_id = 'nasa-hrp-knowledge-base'"
  );
  console.log('Knowledge records:', JSON.stringify(result, null, 2));
}

checkKB().catch(console.error);