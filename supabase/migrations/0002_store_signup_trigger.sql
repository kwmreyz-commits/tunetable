-- Automatically create a store row when a store owner signs up.
-- The store name is passed via auth.signUp's `options.data.store_name`.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.stores (owner_user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'store_name', '新しい店舗'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
