begin;

create table if not exists grocery_image_cache (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  display_name text not null,
  category text,
  image_url text not null,
  source text not null default 'fallback',
  source_id text,
  confidence numeric(4, 3) not null default 0.5,
  lookup_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grocery_image_cache_name_not_blank check (length(trim(normalized_name)) > 0),
  constraint grocery_image_cache_url_not_blank check (length(trim(image_url)) > 0),
  constraint grocery_image_cache_lookup_count_positive check (lookup_count > 0),
  constraint grocery_image_cache_confidence_range check (confidence >= 0 and confidence <= 1)
);

create index if not exists grocery_image_cache_last_used_idx
  on grocery_image_cache(last_used_at desc);

create index if not exists grocery_image_cache_source_idx
  on grocery_image_cache(source);

drop trigger if exists grocery_image_cache_set_updated_at on grocery_image_cache;
create trigger grocery_image_cache_set_updated_at
before update on grocery_image_cache
for each row execute function set_updated_at();

commit;
