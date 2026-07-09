begin;

alter table app_users
add column if not exists clerk_user_id text unique;

create index if not exists app_users_clerk_user_id_idx
on app_users (clerk_user_id);

commit;
