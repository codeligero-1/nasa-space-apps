import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve('..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@vital.app',
    password: 'AdminPass123!'
  });
  
  console.log('Data:', data);
  console.log('Error:', error);
  
  if (data.user) {
    // Update public.users with admin role
    const adminClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { error: insertError } = await adminClient
      .from('users')
      .insert({
        id: data.user.id,
        email: 'admin@vital.app',
        name: 'Admin User',
        role: 'admin'
      });
    
    console.log('Public users insert error:', insertError);
  }
}

createAdmin();
