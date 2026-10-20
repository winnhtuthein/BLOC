FOUNDING MEMBERS: what to do (about 2 minutes)

1. Open your Supabase project -> SQL Editor -> New query.
2. Paste the whole file supabase/migration_003_founding_members.sql and click Run.
   Done. Everyone who has signed up so far is now a founding member, and so is every new signup.

See your list any time (SQL Editor):
   select u.email, f.joined_at from public.founding_members f
   join auth.users u on u.id = f.user_id order by f.joined_at;

WHEN YOU LAUNCH PAID PLANS, close the offer with this one line:
   update public.beta_config set founding_ends_at = now() where id = true;
People already on the list keep their 50%. New signups after that are not added.
Also remove the banner, the welcome-screen link and the Settings card from index.html then.

No server code changed. Nothing here needs a redeploy of the API.
