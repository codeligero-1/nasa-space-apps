/**
 * Script to ingest NASA "5 Hazards of Human Spaceflight" article into PET AI knowledge base
 * Run with: npx tsx src/scripts/ingest-nasa-hazards.ts
 */

import 'dotenv/config';
import { getDb, saveDb } from '../db/connection.js';
import { generateEmbedding } from '../rag/embeddings.js';
import { randomUUID } from 'crypto';

const NASA_ARTICLE_TEXT = `
A human journey to Mars, at first glance, offers an inexhaustible amount of complexities. To bring such a mission to the Red Planet from fiction to fact, NASA's Human Research Program has pinpointed five hazards of human spaceflight astronauts will encounter on a continual basis.

Pooling the challenges of human spaceflight into categories allows for an organized effort to overcome the obstacles that lay before such a mission. However, these hazards do not stand alone. They can interact with each other and create complex risks that are greater than the sum of their parts.

Through meticulous research, NASA is gaining valuable insight into how the human body and mind might respond during extended forays into space. The resulting data, technology, and methods serve as a knowledge base for future missions.

Invisible to the human eye, space radiation is not only stealthy but considered one of the most hazardous aspects of spaceflight. Space radiation consists of particles from the sun and beyond our solar system that can damage DNA and increase cancer risk. On Earth, we're protected by the magnetic field and atmosphere. In space, astronauts are exposed to much higher levels. Radiation exposure can cause acute radiation sickness, increased cancer risk, central nervous system effects, and degenerative diseases. Shielding, pharmaceutical countermeasures, and mission planning are key mitigation strategies.

Behavioral responses occur among groups of people far from Earth who are isolated and confined in a small space over a long period of time. Crews must be carefully chosen, trained, and supported to handle the psychological challenges of isolation and confinement. Sleep disruption, circadian rhythm misalignment, and workload can affect performance and mood. NASA studies team dynamics, communication, and psychological support systems to maintain crew health and mission success.

Instructions, new supplies, medical care, and more become increasingly challenging to receive from Earth as astronauts venture deeper into space. Mars is, on average, 140 million miles from Earth. Rather than a three-day lunar trip, astronauts would be leaving our planet for roughly three years. Communication delays of up to 20 minutes each way mean crews must be autonomous. Medical emergencies must be handled onboard. Planning and self-sufficiency are critical. NASA develops advanced life support, in-situ resource utilization, and autonomous medical systems.

Astronauts' entire bodies – muscles, bones, inner ear, and organs – must adjust to the new gravities encountered on the space station or their spacecraft, as well as on the Moon, Mars, and Earth once again. On Mars, astronauts would need to live and work in three-eighths of Earth's gravitational pull for up to two years. Microgravity causes bone density loss, muscle atrophy, fluid shifts, and vision changes. Partial gravity on Mars (0.38g) may reduce but not eliminate these effects. Exercise countermeasures, artificial gravity concepts, and pharmacological interventions are being studied.

Maintaining a safe ecosystem inside a spacecraft presents unique challenges, from ensuring optimal temperatures, pressures, and lighting, to reducing noise, monitoring microbial communities, and tracking air and water quality. A spacecraft is not only a home, it's also a machine. The ecosystem inside a vehicle plays a big role in everyday astronaut life. Important habitability factors include temperature, pressure, lighting, noise, and microbial monitoring. Closed environments can concentrate contaminants and pathogens. NASA develops environmental control and life support systems (ECLSS) to maintain healthy conditions.
`.trim();

function chunkText(text: string, maxChunkSize: number = 500): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 50);
}

async function ingestNasaHazards() {
  console.log('🚀 Starting NASA Hazards article ingestion...');

  const db = await getDb();

  // Chunk the article
  const chunks = chunkText(NASA_ARTICLE_TEXT, 500);
  console.log(`📝 Article split into ${chunks} chunks`);

  // Generate embeddings for each chunk
  console.log('🔄 Generating embeddings...');
  const records = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`  Processing chunk ${i + 1}/${chunks.length}...`);

    try {
      const embedding = await generateEmbedding(chunk);
      const recordId = randomUUID();

      records.push({
        id: recordId,
        astronaut_id: 'nasa-hrp-knowledge-base',
        type: 'hazard-knowledge',
        data: JSON.stringify({
          title: 'NASA 5 Hazards of Human Spaceflight',
          content: chunk,
          chunkIndex: i,
          totalChunks: chunks.length,
          source: 'https://www.nasa.gov/hrp/hazards/',
          category: 'spaceflight-hazards'
        }),
        recorded_at: new Date().toISOString(),
        embedding: JSON.stringify(embedding)
      });
    } catch (error) {
      console.error(`  ❌ Failed to process chunk ${i + 1}:`, error);
    }
  }

  // Insert into database
  console.log('💾 Inserting records into database...');

  for (const record of records) {
    try {
      const sql = `
        INSERT INTO health_records (id, astronaut_id, type, data, recorded_at, embedding)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.run(sql, [
        record.id,
        record.astronaut_id,
        record.type,
        record.data,
        record.recorded_at,
        record.embedding
      ]);
    } catch (error) {
      console.error(`  ❌ Failed to insert record ${record.id}:`, error);
    }
  }

  console.log(`✅ Successfully ingested ${records.length} knowledge chunks!`);

  // Persist to disk
  saveDb();

  // Verify
  const countResult = db.exec(
    `SELECT COUNT(*) as count FROM health_records WHERE astronaut_id = 'nasa-hrp-knowledge-base'`
  );
  console.log(`📊 Total knowledge records in DB: ${countResult[0]?.values[0]?.[0] || 0}`);

  db.close();
  console.log('🎉 Ingestion complete!');
}

ingestNasaHazards().catch(console.error);