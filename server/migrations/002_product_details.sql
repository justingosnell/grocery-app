begin;

alter table grocery_items
  add column if not exists image_url text,
  add column if not exists brand text,
  add column if not exists barcode text;

create table if not exists grocery_purchase_memory (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references app_users(id) on delete cascade,
  normalized_name text not null,
  display_name text not null,
  category text not null default 'Other',
  emoji text,
  image_url text,
  quantity numeric(10, 2) not null default 1,
  estimated_price numeric(10, 2),
  purchase_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grocery_purchase_memory_name_not_blank check (length(trim(normalized_name)) > 0),
  constraint grocery_purchase_memory_quantity_positive check (quantity > 0),
  constraint grocery_purchase_memory_purchase_count_positive check (purchase_count > 0),
  unique (owner_id, normalized_name)
);

create index if not exists grocery_purchase_memory_owner_last_used_idx
  on grocery_purchase_memory(owner_id, last_used_at desc);

create index if not exists grocery_purchase_memory_owner_count_idx
  on grocery_purchase_memory(owner_id, purchase_count desc);

drop trigger if exists grocery_purchase_memory_set_updated_at on grocery_purchase_memory;
create trigger grocery_purchase_memory_set_updated_at
before update on grocery_purchase_memory
for each row execute function set_updated_at();

commit;
