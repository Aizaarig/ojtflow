
alter table public.ojt_placements
  add column if not exists company_address  text,
  add column if not exists department       text,
  add column if not exists supervisor_name  text,
  add column if not exists supervisor_email text,
  add column if not exists supervisor_phone text;

comment on column public.ojt_placements.company_address  is 'Optional company address.';
comment on column public.ojt_placements.department       is 'Optional department / unit within the company.';
comment on column public.ojt_placements.supervisor_name  is 'Optional supervisor name.';
comment on column public.ojt_placements.supervisor_email is 'Optional supervisor contact email.';
comment on column public.ojt_placements.supervisor_phone is 'Optional supervisor contact phone.';
