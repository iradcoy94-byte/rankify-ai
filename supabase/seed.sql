insert into public.research_periods (school_id, name, metrics, is_active)
values (
  '00000000-0000-4000-8000-000000000001',
  'Penelitian Skripsi',
  '{"prepost":true,"nGain":true,"modelComparison":true}'::jsonb,
  true
)
on conflict (school_id, name) do update set is_active = excluded.is_active;

insert into public.classes (school_id, name, learning_model, kkm)
values
  ('00000000-0000-4000-8000-000000000001', 'Eksperimen 1', 'Co-op Co-op + AI', 68),
  ('00000000-0000-4000-8000-000000000001', 'Eksperimen 2', 'Co-op Co-op', 68),
  ('00000000-0000-4000-8000-000000000001', 'Konvensional', 'Konvensional', 68)
on conflict (school_id, name) do nothing;
