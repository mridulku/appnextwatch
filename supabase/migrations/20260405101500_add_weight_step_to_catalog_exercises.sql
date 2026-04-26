alter table public.catalog_exercises
add column if not exists weight_step_kg numeric(6,2);

comment on column public.catalog_exercises.weight_step_kg is
'Optional per-exercise weight step used by session steppers. Null falls back to app default.';
