import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve('..', '.env') });

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAdminAuth() {
  // Test getting user by ID
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(
    'f161289a-d0f9-4e27-9612-24440e28cfcd'
  );
  console.log('getUserById:', userData, userError);
  
  // Test querying public.users
  const { data: profileData, error: profileError } = await admin
    .from('users')
    .select('role')
    .eq('id', 'f161289a-d0f9-4e27-9612-24440e28cfcd')
    .maybeSingle();
  console.log('users query:', profileData, profileError);
}

testAdminAuth();
