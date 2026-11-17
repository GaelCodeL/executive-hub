-- EXECUTIVE HUB · Security hardening
-- Pin the trigger function search_path to an empty path to prevent object shadowing.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
