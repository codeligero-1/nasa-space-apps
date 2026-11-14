import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve('..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@vital.app',
    password: 'AdminPass123!'
  });
  
  console.log('Data:', data);
  console.log('Error:', error);
}

testLogin();
