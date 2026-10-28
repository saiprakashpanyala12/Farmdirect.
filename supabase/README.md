# Supabase setup

The app's `.env.local` already contains the project's URL and publishable key. Keep that file local; it is ignored by Git. The Supabase client package is already installed. Demo mode is disabled by default and is enabled only with `VITE_DEMO_MODE=true`.

## Database migrations

The project has no Supabase CLI configuration or database credential in this workspace, so deployed SQL and policies cannot be inspected or changed directly here. The project owner reports migrations `001`–`006` have been applied. The supplied result summary confirms relevant objects exist, but does not include complete deployed policy/function definitions or enough output to compare every security predicate to these local migrations.

The current registration flow supports customer, farmer, and business accounts. Migration [`migrations/005_secure_requested_roles.sql`](./migrations/005_secure_requested_roles.sql) allows only those requested non-admin account types at signup; new farmer and business profiles remain unverified, and a farmer's farm starts as `not_submitted`. It also restricts profile column updates so users cannot change their own email, role, or verification status. Compare the deployed function and grants with the local definitions before treating the remote project as verified.

Migration [`migrations/006_quotations.sql`](./migrations/006_quotations.sql) adds a quotation table, RLS policies, and a response guard. Buyers can request offers on approved active products, farmers can respond once, and buyers can cancel unanswered requests. This migration adds a new table and RLS policies; it does not alter or delete existing data.

Migration [`migrations/007_development_onboarding.sql`](./migrations/007_development_onboarding.sql) is new and must be applied to the separate development Supabase project. It adds a private, database-controlled setting that defaults to disabled. To enable automatic approval for new farmer accounts in that development database only, run as the trusted project owner in SQL Editor:

```sql
update farmdirect_private.runtime_settings
set development_onboarding_enabled = true
where id = true;
```

For production, leave the setting false. It is not writable by client roles; changing a frontend variable alone cannot enable farmer privileges or change RLS outcomes. The dev database setting causes only newly registered farmer accounts to have `is_verified = true` and their new farm to be `approved`; it never creates administrators. Existing unconfirmed/role-pending test users are not silently modified by signup. Confirm an existing test user through the trusted Supabase Auth Dashboard, or use a new test address after configuration.

For local Vite development against that dedicated development project, set `VITE_SUPABASE_DEV_AUTH=true` in the ignored `.env.local`, then restart Vite. This flag only changes the UI handling: it suppresses confirmation resend/email screens and surfaces a configuration error if Supabase still returns no session. It does not configure Supabase or authorize a role. Do not set the database onboarding switch or disable confirmation in a production project.

On the development Supabase project, turn off email confirmation through **Authentication → Providers → Email → Confirm email** (the exact UI label may vary slightly). This is a project-level administrator setting and cannot be changed through the publishable key or frontend. Keep email confirmation enabled in production unless the production identity policy explicitly says otherwise; disabling it permits unverified email addresses to sign in and removes an account-ownership check. After changing it, verify the auth settings and register a new test address; existing unconfirmed users may need to be manually confirmed in **Authentication → Users** or recreated with a new test address. Avoid repeated signup/resend requests when email rate limits are active.

After applying migrations, run the read-only checks in [`verification.sql`](./verification.sql) and retain the results to verify the effective remote policies, triggers, grants, image bucket, and development switch. Do not treat a local migration file or this documentation as proof that the remote migration succeeded.

Migrations `001` and `002` are additive and do not drop tables or delete existing rows. The marketplace migration creates tables and indexes, enables RLS, seeds standard product categories, adds atomic test-order/cancellation functions, and creates the `product-images` storage bucket if it does not already exist. If that bucket already exists, confirm in **Storage** that its visibility and upload restrictions match the intended image-access design; the script deliberately does not change the visibility of an existing bucket.

Every `to_regclass` result from `verification.sql` should be non-null, and RLS should be enabled for each of the eight application tables, including `quotation_requests` after migration 006. Review actual policy `USING`/`WITH CHECK` expressions and storage policies rather than relying only on policy names.

## Authentication and farmer onboarding

The signup trigger maps public signup metadata to `customer`, `farmer`, or `business`; every new account remains unverified. It never allows signup metadata to create an administrator. A farmer must be approved by a trusted administrator before creating visible products.

The public Supabase Auth settings endpoint was checked read-only: the email provider is enabled and email auto-confirm is disabled for the currently configured project, so email confirmation is required there until a trusted project owner changes the development setting. That endpoint does not expose SMTP credentials or project email quotas. Supabase's [rate-limit documentation](https://supabase.com/docs/guides/auth/rate-limits) lists a default built-in email sending limit of two messages per hour, and its [SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp) says the built-in provider is restricted to pre-authorized team addresses and is not intended for production. For production verification, configure custom SMTP in **Authentication → SMTP Settings** and review **Authentication → Rate Limits**.

```sql
update public.profiles
set role = 'farmer', is_verified = true
where id = 'AUTH-USER-UUID-HERE';
```

Do not run that statement for an unverified account. Role and verification changes from normal authenticated clients are rejected by the profile trigger. Business access has no separate approval gate in the current data model; keep business-only features disabled until one is implemented if business verification is required by policy.

Test signup, email confirmation, sign-in, session restoration, sign-out, and own-profile access using test accounts. Confirm a second authenticated account cannot read another user's profile, cart, or order. Product creation requires the farmer role and verified status; signup alone does not grant those privileges.

## Marketplace limitations

Checkout creates a pending, unpaid **test** order. The database validates current prices and stock under row locks and reserves stock atomically. A customer can cancel a pending unpaid order to release its reservation. Payment processing, farmer notifications, and delivery booking are not configured.
