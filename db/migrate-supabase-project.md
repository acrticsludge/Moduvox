# Supabase Project Migration Guide

Migrate from one Supabase project to another (database + auth + OAuth).

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`

## Step 1: Dump old database

Get connection string from old project: Dashboard → Project Settings → Database → **Connection string** (use direct connection).

```bash
# Replace YOUR_REF and YOUR_PASSWORD with actual values

# Dump roles
supabase db dump --db-url "postgresql://postgres.YOUR_REF:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres" -f roles.sql --role-only

# Dump schema (includes auth tables)
supabase db dump --db-url "postgresql://postgres.YOUR_REF:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres" -f schema.sql

# Dump data only
supabase db dump --db-url "postgresql://postgres.YOUR_REF:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres" -f data.sql --use-copy --data-only
```

Can't remember password? Dashboard → Project Settings → Database → **Reset database password**.

## Step 2: Create new project

Go to [database.new](https://database.new). Note the new project ref from the dashboard URL.

## Step 3: Restore to new project

Get new project's connection string from its Dashboard → Connect. Then:

```bash
# Replace NEW_REF and NEW_PASSWORD
psql `
  --single-transaction `
  --variable ON_ERROR_STOP=1 `
  --file roles.sql `
  --file schema.sql `
  --command "SET session_replication_role = replica" `
  --file data.sql `
  --dbname "postgresql://postgres.NEW_REF:NEW_PASSWORD@db.NEW_REF.supabase.co:5432/postgres"
```

### If errors occur:
- `supabase_admin` owner error → comment out `ALTER ... OWNER TO "supabase_admin"` lines in `schema.sql`
- `cli_login_postgres` grant error → comment out `GRANT "postgres" TO "cli_login_postgres"` in `roles.sql`

## Step 4: Copy JWT secret (keeps users logged in)

1. **Old project**: Settings → API → JWT Secret (copy it)
2. **New project**: Settings → API → JWT Secret → Edit → Paste old secret

Without this, all users must log in again.

## Step 5: Update Google OAuth

### New Supabase project:
- Authentication → Providers → Google → Enable
- Enter same **Client ID** and **Client Secret** from old project
- Save

### Google Cloud Console:
- Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
- Select your OAuth 2.0 Client ID
- Under **Authorized redirect URIs**, **add** the new project's callback:
  ```
  https://NEW_REF.supabase.co/auth/v1/callback
  ```
- Keep both old and new URIs during migration
- Remove old URI only after confirming everything works

## Step 6: Update Vercel env vars

| Variable | Change to |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://NEW_REF.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | New project's anon key (Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | New project's service_role key |

Other variables (R2, Resend, Gemini, ENCRYPTION_KEY) stay the same.

## Step 7: Delete old project (after verification)

1. Verify the new project works end-to-end (auth, data, R2 files)
2. Old project Dashboard → Project Settings → Delete Project
