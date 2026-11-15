import { getDb } from '../db/connection.js';
import { retrieveRelevantRecords } from '../rag/retrieval.js';
import { generateEmbedding } from '../rag/embeddings.js';

async function testRetrieval() {
  const db = await getDb();

  // Test direct embedding generation
  console.log('Testing embedding generation...');
  const testEmbedding = await generateEmbedding('What are the hazards of spaceflight?');
  console.log('Embedding length:', testEmbedding.length);

  // Test retrieval for knowledge base
  console.log('\nTesting knowledge base retrieval...');
  const kbRecords = await retrieveRelevantRecords({
    astronautId: 'nasa-hrp-knowledge-base',
    query: 'What are the hazards of spaceflight?',
    k: 5,
    includeBaselines: false,
    db
  });
  console.log('KB Records found:', kbRecords.length);
  kbRecords.forEach(r => console.log(`  - ${r.id}: type=${r.type}, similarity=${r.similarity}`));

  // Test retrieval for demo astronaut
  console.log('\nTesting demo astronaut retrieval...');
  const demoRecords = await retrieveRelevantRecords({
    astronautId: 'c1df8d02-ddee-4d36-9a09-80344830991a',
    query: 'What are the hazards of spaceflight?',
    k: 10,
    includeBaselines: true,
    db
  });
  console.log('Demo Records found:', demoRecords.length);
  demoRecords.forEach(r => console.log(`  - ${r.id}: type=${r.type}, similarity=${r.similarity}`));

  // Check raw data in database
  console.log('\nChecking raw database...');
  const kbRaw = db.exec("SELECT id, type, astronaut_id, embedding IS NOT NULL as has_emb FROM health_records WHERE astronaut_id = 'nasa-hrp-knowledge-base'");
  console.log('KB Raw:', JSON.stringify(kbRaw, null, 2));

  const demoRaw = db.exec("SELECT id, type, astronaut_id, embedding IS NOT NULL as has_emb FROM health_records WHERE astronaut_id = 'c1df8d02-ddee-4d36-9a09-80344830991a'");
  console.log('Demo Raw:', JSON.stringify(demoRaw, null, 2));
}

testRetrieval().catch(console.error);