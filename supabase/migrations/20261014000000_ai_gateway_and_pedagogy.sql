-- Rankify.AI: AI Gateway Router and Pedagogical Style Migration
-- Adds ai_tutor_style configuration at school level and ensures search index compatibility.

do $$ begin
  create type public.ai_tutor_style as enum ('socratic', 'direct_steps', 'hints_only');
exception when duplicate_object then null; end $$;

alter table public.schools
  add column if not exists ai_tutor_style public.ai_tutor_style not null default 'socratic';

comment on column public.schools.ai_tutor_style is 'Gaya pengajaran tutor AI sekolah: socratic (bimbingan bertahap), direct_steps (langkah sistematis), atau hints_only (petunjuk konsep/rumus saja).';
