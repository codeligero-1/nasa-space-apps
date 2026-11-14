import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve('..', '.env') });

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetPassword() {
  const { data, error } = await admin.auth.admin.updateUserById(
    '9a54b550-ce65-4ca9-a108-9ca1db929043',
    { password: 'AdminPass123!' }
  );
  
  console.log('Data:', data);
  console.log('Error:', error);
}

resetPassword();
