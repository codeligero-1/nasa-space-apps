import { getDb, saveDb } from '../db/connection.js';

async function addKBAstronaut() {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = 'nasa-hrp-knowledge-base';

  const result = db.run(
    'INSERT OR IGNORE INTO astronauts (id, name, role, mission, nfc_card_id, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, 'NASA HRP Knowledge Base', 'System', 'Knowledge Base', 'NASA-HRP-KB-001', null, now, now]
  );

  console.log('Insert result:', result);
  saveDb();
  console.log('Added NASA HRP Knowledge Base astronaut');

  // Verify
  const verify = db.exec("SELECT * FROM astronauts WHERE id = 'nasa-hrp-knowledge-base'");
  console.log('Verification:', verify);
}

addKBAstronaut().catch(console.error);