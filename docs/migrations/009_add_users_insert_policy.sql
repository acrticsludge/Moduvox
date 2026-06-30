-- docs/migrations/009_add_users_insert_policy.sql
-- Allow users to insert their own row (needed for upsert from API route)

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
