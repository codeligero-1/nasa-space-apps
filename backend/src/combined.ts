import { createAdminServer } from './server.js';
import { createSupabaseAdminAuthProvider } from './admin-auth.js';
import { createSupabaseAstronautAuthProvider } from './astronaut-auth.js';
import { createSqliteAstronautAuthProvider } from './astronaut-auth.js';
import { getDb } from './db/connection.js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
// Load backend/.env first (has NVIDIA_API_KEY), then fall back to project root
config({ path: resolve(__dirname, '..', '.env') });
config({ path: resolve(__dirname, '..', '..', '.env') });

const port = Number(process.env.PORT || 3000);
const projectRoot = resolve(__dirname, '..', '..');
const publicRoot = resolve(projectRoot, 'backend', 'public');
const isProduction = process.env.NODE_ENV === 'production';

let adminAuthProvider;
let astronautAuthProvider;

if (isProduction) {
  adminAuthProvider = createSupabaseAdminAuthProvider(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  astronautAuthProvider = createSupabaseAstronautAuthProvider(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
} else {
  // Development: Use SQLite for astronaut auth, Supabase for admin (if configured)
  const db = await getDb();

  adminAuthProvider = createSupabaseAdminAuthProvider(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  astronautAuthProvider = createSqliteAstronautAuthProvider(db);
}

const server = createAdminServer(adminAuthProvider, astronautAuthProvider, projectRoot);

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server on http://localhost:${port}`);
  console.log(`   Main:       http://localhost:${port}/`);
  console.log(`   Admin:      http://localhost:${port}/admin/login`);
  console.log(`   Astronaut API: http://localhost:${port}/api/astronaut/verify-nfc`);
  console.log(`   Mode:       ${isProduction ? 'Production (Supabase)' : 'Development (SQLite)'}`);
});
