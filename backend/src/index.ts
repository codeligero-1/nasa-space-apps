import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createSupabaseAdminAuthProvider } from './admin-auth.js'
import { createAdminServer } from './server.js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
config({ path: resolve(projectRoot, '.env') })

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const port = Number(process.env.PORT || 3000)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port number.')
}

const authProvider = createSupabaseAdminAuthProvider(
  requiredEnvironmentVariable('SUPABASE_URL'),
  requiredEnvironmentVariable('SUPABASE_ANON_KEY'),
  requiredEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY')
)
const server = createAdminServer(authProvider, projectRoot)

server.listen(port, '0.0.0.0', () => {
  console.log(`VITAL application server listening on port ${port}.`)
})
