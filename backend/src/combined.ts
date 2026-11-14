import { createAdminServer } from './server.js';
import { createSupabaseAdminAuthProvider } from './admin-auth.js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
config({ path: resolve(__dirname, '..', '..', '.env') });

const port = Number(process.env.PORT || 3000);
const projectRoot = resolve(__dirname, '..', '..');

const authProvider = createSupabaseAdminAuthProvider(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const server = createAdminServer(authProvider, projectRoot);

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server on http://localhost:${port}`);
  console.log(`   Main:       http://localhost:${port}/`);
  console.log(`   Admin:      http://localhost:${port}/admin/login`);
});
