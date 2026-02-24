create table if not exists public.catalog_gym_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(name)) stored,
  description text,
  focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_gym_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.catalog_gym_templates(id) on delete cascade,
  exercise_id uuid not null references public.catalog_exercises(id) on delete restrict,
  sort_order integer not null,
  block_label text,
  created_at timestamptz not null default now(),
  unique(template_id, sort_order)
);

create table if not exists public.catalog_gym_template_sets (
  id uuid primary key default gen_random_uuid(),
  template_exercise_id uuid not null references public.catalog_gym_template_exercises(id) on delete cascade,
  set_index integer not null,
  planned_reps integer,
  planned_weight_kg numeric(10,2),
  created_at timestamptz not null default now(),
  unique(template_exercise_id, set_index)
);

create unique index if not exists catalog_gym_templates_name_key_uq
  on public.catalog_gym_templates(name_key);

create index if not exists idx_catalog_gym_template_exercises_template
  on public.catalog_gym_template_exercises(template_id, sort_order);

create index if not exists idx_catalog_gym_template_sets_exercise
  on public.catalog_gym_template_sets(template_exercise_id, set_index);

alter table public.catalog_gym_templates enable row level security;
alter table public.catalog_gym_template_exercises enable row level security;
alter table public.catalog_gym_template_sets enable row level security;

drop policy if exists catalog_gym_templates_read_policy on public.catalog_gym_templates;
drop policy if exists catalog_gym_template_exercises_read_policy on public.catalog_gym_template_exercises;
drop policy if exists catalog_gym_template_sets_read_policy on public.catalog_gym_template_sets;

create policy catalog_gym_templates_read_policy on public.catalog_gym_templates
for select to public
using (true);

create policy catalog_gym_template_exercises_read_policy on public.catalog_gym_template_exercises
for select to public
using (true);

create policy catalog_gym_template_sets_read_policy on public.catalog_gym_template_sets
for select to public
using (true);

drop trigger if exists set_catalog_gym_templates_updated_at on public.catalog_gym_templates;
create trigger set_catalog_gym_templates_updated_at
before update on public.catalog_gym_templates
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select on table public.catalog_gym_templates to anon, authenticated;
grant select on table public.catalog_gym_template_exercises to anon, authenticated;
grant select on table public.catalog_gym_template_sets to anon, authenticated;

insert into public.catalog_gym_templates (name, description, focus)
values
  ('Push Day Template', 'Warm-up: 5 minutes light cardio and shoulder prep. Main pressing sequence with shoulder and triceps work. Finish with a short cooldown.', 'Chest / Shoulders / Triceps'),
  ('Pull Day Template', 'Warm-up: brisk walk + band activation. Main pulling sequence with upper-back and biceps emphasis. Finish with cooldown breathing.', 'Back / Biceps'),
  ('Leg Day Template', 'Warm-up: dynamic lower-body drills. Main squat and leg press sequence for volume. End with optional core and cooldown.', 'Quads / Glutes / Lower body')
on conflict (name_key) do update set
  description = excluded.description,
  focus = excluded.focus,
  updated_at = now();

with template_rows as (
  select id, name_key
  from public.catalog_gym_templates
  where name_key in ('push day template', 'pull day template', 'leg day template')
), exercise_rows as (
  select id, name_key
  from public.catalog_exercises
  where name_key in (
    'bench press',
    'incline dumbbell press',
    'shoulder press',
    'lateral raise',
    'triceps pushdown',
    'lat pulldown',
    'seated cable row',
    'biceps curl',
    'back squat',
    'leg press'
  )
), seed_plan as (
  select
    t.id as template_id,
    e.id as exercise_id,
    p.sort_order,
    p.block_label
  from (
    values
      ('push day template', 'bench press', 1, 'Main Pressing'),
      ('push day template', 'incline dumbbell press', 2, 'Upper Chest'),
      ('push day template', 'shoulder press', 3, 'Shoulder Compound'),
      ('push day template', 'lateral raise', 4, 'Shoulder Isolation'),
      ('push day template', 'triceps pushdown', 5, 'Triceps Finisher'),

      ('pull day template', 'lat pulldown', 1, 'Vertical Pull'),
      ('pull day template', 'seated cable row', 2, 'Horizontal Pull'),
      ('pull day template', 'lat pulldown', 3, 'Back Volume'),
      ('pull day template', 'biceps curl', 4, 'Biceps Focus'),
      ('pull day template', 'seated cable row', 5, 'Back Finisher'),

      ('leg day template', 'back squat', 1, 'Main Lower Compound'),
      ('leg day template', 'leg press', 2, 'Quad Volume'),
      ('leg day template', 'back squat', 3, 'Strength Back-off'),
      ('leg day template', 'leg press', 4, 'Leg Pump'),
      ('leg day template', 'lateral raise', 5, 'Accessory / Balance')
  ) as p(template_key, exercise_key, sort_order, block_label)
  join template_rows t on t.name_key = p.template_key
  join exercise_rows e on e.name_key = p.exercise_key
)
insert into public.catalog_gym_template_exercises (template_id, exercise_id, sort_order, block_label)
select template_id, exercise_id, sort_order, block_label
from seed_plan
on conflict (template_id, sort_order) do update set
  exercise_id = excluded.exercise_id,
  block_label = excluded.block_label;

with template_exercise_rows as (
  select
    t.name_key as template_key,
    te.id as template_exercise_id,
    te.sort_order
  from public.catalog_gym_template_exercises te
  join public.catalog_gym_templates t on t.id = te.template_id
  where t.name_key in ('push day template', 'pull day template', 'leg day template')
), set_seed as (
  select
    r.template_exercise_id,
    s.set_index,
    s.planned_reps,
    s.planned_weight_kg
  from (
    values
      ('push day template', 1, 1, 8, 40), ('push day template', 1, 2, 8, 40), ('push day template', 1, 3, 8, 42.5), ('push day template', 1, 4, 6, 45),
      ('push day template', 2, 1, 10, 16), ('push day template', 2, 2, 10, 16), ('push day template', 2, 3, 10, 18),
      ('push day template', 3, 1, 10, 14), ('push day template', 3, 2, 10, 14), ('push day template', 3, 3, 8, 16),
      ('push day template', 4, 1, 15, 8), ('push day template', 4, 2, 15, 8), ('push day template', 4, 3, 12, 10),
      ('push day template', 5, 1, 12, 22), ('push day template', 5, 2, 12, 24), ('push day template', 5, 3, 10, 26),

      ('pull day template', 1, 1, 8, 35), ('pull day template', 1, 2, 8, 37.5), ('pull day template', 1, 3, 8, 40), ('pull day template', 1, 4, 6, 42.5),
      ('pull day template', 2, 1, 10, 30), ('pull day template', 2, 2, 10, 32.5), ('pull day template', 2, 3, 10, 35),
      ('pull day template', 3, 1, 12, 30), ('pull day template', 3, 2, 12, 32.5), ('pull day template', 3, 3, 10, 35),
      ('pull day template', 4, 1, 12, 10), ('pull day template', 4, 2, 12, 10), ('pull day template', 4, 3, 10, 12),
      ('pull day template', 5, 1, 12, 30), ('pull day template', 5, 2, 12, 32.5), ('pull day template', 5, 3, 12, 35),

      ('leg day template', 1, 1, 6, 60), ('leg day template', 1, 2, 6, 65), ('leg day template', 1, 3, 5, 70), ('leg day template', 1, 4, 5, 72.5),
      ('leg day template', 2, 1, 12, 120), ('leg day template', 2, 2, 12, 130), ('leg day template', 2, 3, 10, 140), ('leg day template', 2, 4, 10, 150),
      ('leg day template', 3, 1, 8, 55), ('leg day template', 3, 2, 8, 57.5), ('leg day template', 3, 3, 8, 60),
      ('leg day template', 4, 1, 15, 100), ('leg day template', 4, 2, 15, 110), ('leg day template', 4, 3, 12, 120),
      ('leg day template', 5, 1, 15, 8), ('leg day template', 5, 2, 15, 8), ('leg day template', 5, 3, 12, 10)
  ) as s(template_key, sort_order, set_index, planned_reps, planned_weight_kg)
  join template_exercise_rows r
    on r.template_key = s.template_key
   and r.sort_order = s.sort_order
)
insert into public.catalog_gym_template_sets (template_exercise_id, set_index, planned_reps, planned_weight_kg)
select template_exercise_id, set_index, planned_reps, planned_weight_kg
from set_seed
on conflict (template_exercise_id, set_index) do update set
  planned_reps = excluded.planned_reps,
  planned_weight_kg = excluded.planned_weight_kg;

notify pgrst, 'reload schema';
