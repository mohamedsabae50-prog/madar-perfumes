# MADAR Storefront

The customer storefront is deployed independently from the MADAR Admin project. Both projects use the same Supabase project and refresh store data on page load, tab focus, and Supabase Realtime changes.

## Local development

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`.
2. Run `supabase_schema.sql` in the Supabase SQL Editor. This creates the tables and enables the relevant tables in the `supabase_realtime` publication.
3. Run `npm install`, then `npm run dev`.

The seed command can be rerun safely with `npm run supabase:seed`. It uses the public anon/publishable key; never put a service-role key in the Vite environment.

## Separate deployments

- `mohamedsabae50-prog/madar-perfumes` serves the customer storefront at `/`.
- `mohamedsabae50-prog/madar-admin` serves the admin portal at `/`. Set `VITE_STOREFRONT_URL` in the admin deployment to the storefront's deployed URL; it defaults to the storefront repository URL.

Configure both Vercel projects with the same Supabase URL and public publishable/anon key. Keep `.env` local and untracked.
