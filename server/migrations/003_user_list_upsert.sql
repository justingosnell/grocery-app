begin;

create index if not exists grocery_lists_owner_name_lookup_idx
on grocery_lists (owner_id, lower(name))
where owner_id is not null and is_archived = false;

commit;
