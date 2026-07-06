begin;

create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_email_format check (
    email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
);

create table if not exists grocery_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references app_users(id) on delete set null,
  name text not null,
  description text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grocery_lists_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists grocery_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references grocery_lists(id) on delete cascade,
  name text not null,
  quantity numeric(10, 2) not null default 1,
  unit text,
  emoji text,
  category text not null default 'Other',
  estimated_price numeric(10, 2),
  notes text,
  sort_order integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grocery_items_name_not_blank check (length(trim(name)) > 0),
  constraint grocery_items_quantity_positive check (quantity > 0),
  constraint grocery_items_estimated_price_nonnegative check (estimated_price is null or estimated_price >= 0),
  constraint grocery_items_completed_at_consistency check (
    (completed and completed_at is not null) or (not completed and completed_at is null)
  )
);

create table if not exists grocery_list_shares (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references grocery_lists(id) on delete cascade,
  shared_with_user_id uuid references app_users(id) on delete cascade,
  share_token text unique default encode(gen_random_bytes(24), 'base64url'),
  permission text not null default 'view',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint grocery_list_shares_permission_check check (permission in ('view', 'edit')),
  constraint grocery_list_shares_target_check check (shared_with_user_id is not null or share_token is not null)
);

create index if not exists grocery_lists_owner_id_idx on grocery_lists(owner_id);
create index if not exists grocery_lists_updated_at_idx on grocery_lists(updated_at desc);
create index if not exists grocery_items_list_id_sort_order_idx on grocery_items(list_id, sort_order, created_at);
create index if not exists grocery_items_list_id_completed_idx on grocery_items(list_id, completed);
create index if not exists grocery_items_category_idx on grocery_items(category);
create index if not exists grocery_list_shares_list_id_idx on grocery_list_shares(list_id);
create index if not exists grocery_list_shares_shared_with_user_id_idx on grocery_list_shares(shared_with_user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_users_set_updated_at on app_users;
create trigger app_users_set_updated_at
before update on app_users
for each row execute function set_updated_at();

drop trigger if exists grocery_lists_set_updated_at on grocery_lists;
create trigger grocery_lists_set_updated_at
before update on grocery_lists
for each row execute function set_updated_at();

drop trigger if exists grocery_items_set_updated_at on grocery_items;
create trigger grocery_items_set_updated_at
before update on grocery_items
for each row execute function set_updated_at();

create or replace function set_completed_at()
returns trigger as $$
begin
  if new.completed = true then
    if tg_op = 'INSERT' or old.completed = false or new.completed_at is null then
      new.completed_at = coalesce(new.completed_at, now());
    end if;
  elsif new.completed = false then
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists grocery_items_set_completed_at on grocery_items;
create trigger grocery_items_set_completed_at
before insert or update on grocery_items
for each row execute function set_completed_at();

commit;
