-- Rankify.AI single-school pilot schema. Supabase Auth is the only identity source.
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'guru', 'siswa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assessment_kind as enum ('pretest', 'meeting', 'posttest');
exception when duplicate_object then null; end $$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_kkm numeric(5,2) not null default 68 check (default_kkm between 0 and 100),
  created_at timestamptz not null default now()
);

insert into public.schools (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Sekolah Pilot Rankify')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id),
  role public.app_role not null default 'siswa',
  full_name text not null default '',
  email text not null,
  nisn text,
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, nisn)
  );
alter table public.profiles add column if not exists is_active boolean not null default true;
create unique index if not exists profiles_school_email_idx on public.profiles (school_id, lower(email));

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  learning_model text,
  kkm numeric(5,2) not null default 68 check (kkm between 0 and 100),
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table if not exists public.class_memberships (
  class_id uuid not null references public.classes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role public.app_role not null check (member_role in ('guru', 'siswa')),
  created_at timestamptz not null default now(),
  primary key (class_id, profile_id)
);

create table if not exists public.research_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  metrics jsonb not null default '{"prepost":true,"nGain":true,"modelComparison":true}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table if not exists public.student_scores (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  period_id uuid not null references public.research_periods(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind public.assessment_kind not null,
  meeting integer,
  score numeric(5,2) not null check (score between 0 and 100),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'meeting' and meeting is not null and meeting > 0) or (kind <> 'meeting' and meeting is null)),
  unique nulls not distinct (student_id, period_id, kind, meeting)
);
create index if not exists student_scores_class_period_idx on public.student_scores (class_id, period_id, kind, meeting);

create table if not exists public.import_quarantine (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  period_id uuid references public.research_periods(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  source text not null,
  row_data jsonb not null,
  reason text not null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  title text not null,
  storage_path text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.learning_material_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  page_number integer,
  content text not null,
  search_document tsvector generated always as (to_tsvector('simple', content)) stored
);
create index if not exists learning_material_chunks_search_idx on public.learning_material_chunks using gin (search_document);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_role public.app_role;
  selected_school uuid;
begin
  begin
    requested_role := (new.raw_app_meta_data ->> 'rankify_role')::public.app_role;
  exception when others then
    requested_role := 'siswa';
  end;
  selected_school := coalesce((new.raw_app_meta_data ->> 'school_id')::uuid, '00000000-0000-4000-8000-000000000001'::uuid);
  insert into public.profiles (id, school_id, role, full_name, email, nisn, must_change_password)
  values (
    new.id,
    selected_school,
    requested_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'nisn', ''),
    coalesce((new.raw_app_meta_data ->> 'must_change_password')::boolean, true)
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_rankify on auth.users;
create trigger on_auth_user_created_rankify
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_class_member(target_class uuid, target_role public.app_role default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_memberships cm
    where cm.class_id = target_class and cm.profile_id = auth.uid()
      and (target_role is null or cm.member_role = target_role)
  )
$$;

create or replace function public.can_manage_profile(target_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() = 'admin' or exists (
    select 1 from public.class_memberships mine
    join public.class_memberships theirs on theirs.class_id = mine.class_id
    where mine.profile_id = auth.uid() and mine.member_role = 'guru'
      and theirs.profile_id = target_profile and theirs.member_role = 'siswa'
  )
$$;

revoke all on function public.current_role() from public;
revoke all on function public.current_school_id() from public;
revoke all on function public.is_class_member(uuid, public.app_role) from public;
revoke all on function public.can_manage_profile(uuid) from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.current_school_id() to authenticated;
grant execute on function public.is_class_member(uuid, public.app_role) to authenticated;
grant execute on function public.can_manage_profile(uuid) to authenticated;

create or replace function public.assign_creator_to_class()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() = 'guru' then
    insert into public.class_memberships (class_id, profile_id, member_role)
    values (new.id, auth.uid(), 'guru') on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_creator_to_rankify_class on public.classes;
create trigger assign_creator_to_rankify_class after insert on public.classes
  for each row execute procedure public.assign_creator_to_class();

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table public.research_periods enable row level security;
alter table public.student_scores enable row level security;
alter table public.import_quarantine enable row level security;
alter table public.learning_materials enable row level security;
alter table public.learning_material_chunks enable row level security;

drop policy if exists "school members read school" on public.schools;
create policy "school members read school" on public.schools for select to authenticated
  using (id = public.current_school_id());
drop policy if exists "admin manages school" on public.schools;
create policy "admin manages school" on public.schools for update to authenticated
  using (id = public.current_school_id() and public.current_role() = 'admin')
  with check (id = public.current_school_id() and public.current_role() = 'admin');

drop policy if exists "profile self or class roster" on public.profiles;
create policy "profile self or class roster" on public.profiles for select to authenticated
  using (id = auth.uid() or (school_id = public.current_school_id() and (public.current_role() = 'admin' or exists (
    select 1 from public.class_memberships cm where cm.profile_id = id and public.is_class_member(cm.class_id, 'guru')
  ))));
drop policy if exists "profile self update" on public.profiles;
create policy "profile self update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.can_manage_profile(id))
  with check ((id = auth.uid() and role = public.current_role() and school_id = public.current_school_id()) or public.can_manage_profile(id));
revoke update on public.profiles from authenticated;
grant update (full_name, must_change_password) on public.profiles to authenticated;

drop policy if exists "class member reads class" on public.classes;
create policy "class member reads class" on public.classes for select to authenticated
  using (school_id = public.current_school_id() and (public.current_role() = 'admin' or exists (
    select 1 from public.class_memberships cm where cm.class_id = id and cm.profile_id = auth.uid()
  )));
drop policy if exists "teacher manages class settings" on public.classes;
create policy "teacher manages class settings" on public.classes for update to authenticated
  using (school_id = public.current_school_id() and (public.current_role() = 'admin' or public.is_class_member(id, 'guru')))
  with check (school_id = public.current_school_id() and (public.current_role() = 'admin' or public.is_class_member(id, 'guru')));
drop policy if exists "teacher creates class" on public.classes;
create policy "teacher creates class" on public.classes for insert to authenticated
  with check (school_id = public.current_school_id() and public.current_role() in ('guru', 'admin'));
drop policy if exists "admin deletes class" on public.classes;
create policy "admin deletes class" on public.classes for delete to authenticated
  using (school_id = public.current_school_id() and public.current_role() = 'admin');

drop policy if exists "members read memberships" on public.class_memberships;
create policy "members read memberships" on public.class_memberships for select to authenticated
  using (profile_id = auth.uid() or public.current_role() = 'admin' or public.is_class_member(class_id, 'guru'));
drop policy if exists "admin manages memberships" on public.class_memberships;
create policy "admin manages memberships" on public.class_memberships for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists "members read research periods" on public.research_periods;
create policy "members read research periods" on public.research_periods for select to authenticated
  using (school_id = public.current_school_id() and (public.current_role() = 'admin' or exists (
    select 1 from public.class_memberships cm join public.classes c on c.id = cm.class_id
    where cm.profile_id = auth.uid() and c.school_id = public.research_periods.school_id
  )));
drop policy if exists "teachers manage research periods" on public.research_periods;
create policy "teachers manage research periods" on public.research_periods for all to authenticated
  using (school_id = public.current_school_id() and (public.current_role() = 'admin' or exists (
    select 1 from public.class_memberships cm join public.classes c on c.id = cm.class_id
    where cm.profile_id = auth.uid() and cm.member_role = 'guru' and c.school_id = public.research_periods.school_id
  )))
  with check (school_id = public.current_school_id() and (public.current_role() = 'admin' or exists (
    select 1 from public.class_memberships cm join public.classes c on c.id = cm.class_id
    where cm.profile_id = auth.uid() and cm.member_role = 'guru' and c.school_id = public.research_periods.school_id
  )));

drop policy if exists "score rows access" on public.student_scores;
create policy "score rows access" on public.student_scores for select to authenticated
  using (school_id = public.current_school_id() and (
    public.current_role() = 'admin' or student_id = auth.uid() or public.is_class_member(class_id, 'guru')
  ));
drop policy if exists "teacher writes score rows" on public.student_scores;
create policy "teacher writes score rows" on public.student_scores for insert to authenticated
  with check (school_id = public.current_school_id() and (public.current_role() = 'admin' or public.is_class_member(class_id, 'guru')));
drop policy if exists "teacher updates score rows" on public.student_scores;
create policy "teacher updates score rows" on public.student_scores for update to authenticated
  using (school_id = public.current_school_id() and (public.current_role() = 'admin' or public.is_class_member(class_id, 'guru')))
  with check (school_id = public.current_school_id() and (public.current_role() = 'admin' or public.is_class_member(class_id, 'guru')));
drop policy if exists "teacher deletes score rows" on public.student_scores;
create policy "teacher deletes score rows" on public.student_scores for delete to authenticated
  using (school_id = public.current_school_id() and (public.current_role() = 'admin' or public.is_class_member(class_id, 'guru')));

drop policy if exists "teachers read quarantine" on public.import_quarantine;
create policy "teachers read quarantine" on public.import_quarantine for select to authenticated
  using (school_id = public.current_school_id() and (public.current_role() = 'admin' or (class_id is not null and public.is_class_member(class_id, 'guru')) or created_by = auth.uid()));
drop policy if exists "teachers add quarantine" on public.import_quarantine;
create policy "teachers add quarantine" on public.import_quarantine for insert to authenticated
  with check (school_id = public.current_school_id() and (public.current_role() = 'admin' or (created_by = auth.uid() and (class_id is null or public.is_class_member(class_id, 'guru')))));
drop policy if exists "teachers resolve quarantine" on public.import_quarantine;
create policy "teachers resolve quarantine" on public.import_quarantine for update to authenticated
  using (school_id = public.current_school_id() and (public.current_role() = 'admin' or created_by = auth.uid() or (class_id is not null and public.is_class_member(class_id, 'guru'))))
  with check (school_id = public.current_school_id() and (public.current_role() = 'admin' or created_by = auth.uid() or (class_id is not null and public.is_class_member(class_id, 'guru'))));

drop policy if exists "read approved learning materials" on public.learning_materials;
create policy "read approved learning materials" on public.learning_materials for select to authenticated
  using (school_id = public.current_school_id() and (review_status = 'approved' or public.current_role() in ('guru', 'admin')));
drop policy if exists "teacher manages learning materials" on public.learning_materials;
create policy "teacher manages learning materials" on public.learning_materials for all to authenticated
  using (school_id = public.current_school_id() and (public.current_role() = 'admin' or (public.current_role() = 'guru' and uploaded_by = auth.uid())))
  with check (school_id = public.current_school_id() and (public.current_role() = 'admin' or (uploaded_by = auth.uid() and public.current_role() = 'guru')));
drop policy if exists "read approved material chunks" on public.learning_material_chunks;
create policy "read approved material chunks" on public.learning_material_chunks for select to authenticated
  using (school_id = public.current_school_id() and exists (
    select 1 from public.learning_materials m where m.id = material_id and (m.review_status = 'approved' or public.current_role() in ('guru', 'admin'))
  ));
drop policy if exists "teacher manages material chunks" on public.learning_material_chunks;
create policy "teacher manages material chunks" on public.learning_material_chunks for all to authenticated
  using (school_id = public.current_school_id() and public.current_role() in ('guru', 'admin'))
  with check (school_id = public.current_school_id() and public.current_role() in ('guru', 'admin'));

create or replace function public.get_my_class_ranking(
  p_period_id uuid,
  p_kind public.assessment_kind,
  p_meeting integer default null
)
returns table(full_name text, dense_rank bigint, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  target_class uuid;
begin
  if public.current_role() <> 'siswa' then
    raise exception 'Hanya akun siswa yang dapat memakai fungsi ini';
  end if;
  select cm.class_id into target_class
  from public.class_memberships cm
  where cm.profile_id = auth.uid() and cm.member_role = 'siswa'
  order by cm.created_at asc limit 1;
  if target_class is null then return; end if;
  return query
    select p.full_name,
      dense_rank() over (order by s.score desc) as dense_rank,
      s.student_id = auth.uid() as is_me
    from public.student_scores s
    join public.profiles p on p.id = s.student_id
    where s.class_id = target_class and s.period_id = p_period_id
      and s.kind = p_kind and s.meeting is not distinct from p_meeting
    order by s.score desc, p.full_name asc;
end;
$$;
revoke all on function public.get_my_class_ranking(uuid, public.assessment_kind, integer) from public;
grant execute on function public.get_my_class_ranking(uuid, public.assessment_kind, integer) to authenticated;

create or replace function public.search_learning_materials(search_text text, max_rows integer default 6)
returns table(material_id uuid, title text, page_number integer, content text)
language sql stable security invoker set search_path = public as $$
  select c.material_id, m.title, c.page_number, c.content
  from public.learning_material_chunks c
  join public.learning_materials m on m.id = c.material_id
  where c.school_id = public.current_school_id()
    and m.review_status = 'approved'
    and (c.search_document @@ websearch_to_tsquery('simple', search_text)
      or c.content ilike '%' || left(search_text, 80) || '%')
  order by ts_rank(c.search_document, websearch_to_tsquery('simple', search_text)) desc
  limit greatest(1, least(max_rows, 10));
$$;
grant execute on function public.search_learning_materials(text, integer) to authenticated;
revoke all on function public.search_learning_materials(text, integer) from public;
grant execute on function public.search_learning_materials(text, integer) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('learning-materials', 'learning-materials', false, 26214400, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 26214400, allowed_mime_types = array['application/pdf'];

drop policy if exists "school members read learning pdfs" on storage.objects;
create policy "school members read learning pdfs" on storage.objects for select to authenticated
  using (bucket_id = 'learning-materials' and (storage.foldername(name))[1] = public.current_school_id()::text);
drop policy if exists "teachers upload learning pdfs" on storage.objects;
create policy "teachers upload learning pdfs" on storage.objects for insert to authenticated
  with check (bucket_id = 'learning-materials' and (storage.foldername(name))[1] = public.current_school_id()::text and public.current_role() in ('guru', 'admin'));
drop policy if exists "teachers update learning pdfs" on storage.objects;
create policy "teachers update learning pdfs" on storage.objects for update to authenticated
  using (bucket_id = 'learning-materials' and (storage.foldername(name))[1] = public.current_school_id()::text and public.current_role() in ('guru', 'admin'));
drop policy if exists "teachers delete learning pdfs" on storage.objects;
create policy "teachers delete learning pdfs" on storage.objects for delete to authenticated
  using (bucket_id = 'learning-materials' and (storage.foldername(name))[1] = public.current_school_id()::text and public.current_role() in ('guru', 'admin'));
