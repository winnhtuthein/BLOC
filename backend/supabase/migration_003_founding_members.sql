-- Early-access offer: marks every account created during the beta as a founding member.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- When you launch paid plans, close the offer with ONE line:
--   update public.beta_config set founding_ends_at = now() where id = true;
-- Accounts created after that moment are not marked. Everyone already marked keeps it.

create table if not exists public.beta_config (
  id               boolean primary key default true check (id),   -- single row
  founding_ends_at timestamptz                                     -- null = offer still open
);
insert into public.beta_config (id) values (true) on conflict do nothing;
alter table public.beta_config enable row level security;            -- no policies: nobody reads it through the API

create table if not exists public.founding_members (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now()
);
alter table public.founding_members enable row level security;
drop policy if exists "own row: select" on public.founding_members;
create policy "own row: select" on public.founding_members for select to authenticated using (user_id = auth.uid());

create or replace function public.mark_founding_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select founding_ends_at from public.beta_config where id) is null then
    insert into public.founding_members (user_id, joined_at) values (new.id, new.created_at) on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_founding on auth.users;
create trigger on_auth_user_founding after insert on auth.users
  for each row execute function public.mark_founding_member();

-- Everyone who already signed up counts too.
insert into public.founding_members (user_id, joined_at)
  select id, created_at from auth.users on conflict do nothing;

-- To see your list (SQL editor only, you are the owner):
--   select u.email, f.joined_at from public.founding_members f join auth.users u on u.id = f.user_id order by f.joined_at;
