# VITAL administrator authentication

The Node server serves the existing crew application at `/`, the separate administrator sign-in page at `/admin/login`, and the protected administrator dashboard at `/admin/dashboard`. The admin API and dashboard must be served by this backend; do not host the admin HTML as an unrestricted static site.

## Run the demo dashboard

From the repository root, run `npm run dev` and open `http://127.0.0.1:3000`. This local demo server serves only the public dashboard and its assets; administrator pages remain restricted to the authenticated backend.

## Configuration

1. Copy the project-root `.env.example` to `.env`.
2. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase project. Keep the service-role key on the server only; never put it in frontend files or commit `.env`.
3. Configure the Supabase `public.users` table and enable Row Level Security. The backend uses the service-role client to read the profile role.
4. Start the authenticated backend locally with `npm --prefix backend run dev:server`. For production, build with `npm --prefix backend run build`, then run `npm --prefix backend run start:server` with `NODE_ENV=production` behind HTTPS.

The `Username` field accepts the administrator's email address. Sign-in requires a valid Supabase Auth password, a confirmed email, an account that is not banned or deleted, and a matching `public.users` row whose `role` is exactly `admin`. The role is checked again on every dashboard/API session request. No public admin registration endpoint exists.

## Provisioning an administrator

Create or invite an administrator in Supabase Auth using the trusted Supabase dashboard or another private operator workflow. After confirming the account, create or update its profile so its ID exactly matches the Auth user ID:

```sql
INSERT INTO public.users (id, email, name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', email), 'admin'
FROM auth.users
WHERE id = 'REPLACE_WITH_AUTH_USER_UUID'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = 'admin';
```

Only trusted operators should run this statement. The application never promotes a user based on a card, username, or frontend value.

## Session and deployment notes

Admin sessions use random, `HttpOnly`, `SameSite=Strict` cookies with an 8-hour lifetime, or a 30-day lifetime when “Remember this device” is selected. Production cookies are marked `Secure`; deploy behind HTTPS and set `NODE_ENV=production`. Login requests are same-origin checked and rate-limited.

The current session store is in process memory, so run one backend instance. Sessions are cleared on restart; use a shared, securely managed session store before scaling to multiple instances. Do not expose this backend directly over plain HTTP in production.

Run the focused checks with `npm --prefix backend run test:admin` and `npm --prefix backend run build`.
