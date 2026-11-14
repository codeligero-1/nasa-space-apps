import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve('..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function signUpTest() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test-signup@vital.app',
    password: 'TestPass123!'
  });
  
  console.log('Data:', data);
  console.log('Error:', error);
}

signUpTest();
