# Schema Map

## Movies Domain

### `movies`
- Purpose: Movie catalog records with metadata and media references.
- Key columns: `id`, `title`, `year`, `genre`, `rating`, `overview`, `clips`.
- Surfaces: Movies → Explore reels, Directory, Movie detail.

### `actors`
- Purpose: Talent directory entries for actors.
- Key columns: `id`, `name`, `sort_name`, `role_type`, `bio`.
- Surfaces: Movies → Directory → Actors, Actor detail.

### `directors`
- Purpose: Talent directory entries for directors.
- Key columns: `id`, `name`, `sort_name`, `bio`.
- Surfaces: Movies → Directory → Directors, Director detail.

### `movie_actors`
- Purpose: Movie-to-actor mapping with credit attributes.
- Key columns: `movie_id`, `actor_id`, `character_name`, `billing_order`.
- Surfaces: Actor credits and movie cast relationships.

### `movie_directors`
- Purpose: Movie-to-director mapping.
- Key columns: `movie_id`, `director_id`.
- Surfaces: Director credits and movie crew relationships.

### `awards`
- Purpose: Legacy awards table linked to movies.
- Key columns: `id`, `year`, `category`, `winner`, `movie_id`.
- Surfaces: Data inspector and awards-related debug surfaces.

### `award_shows`
- Purpose: Award show definitions.
- Key columns: `id`, `name`.
- Surfaces: Directory → Awards.

### `award_years`
- Purpose: Per-show ceremony years.
- Key columns: `id`, `show_id`, `year`.
- Surfaces: Directory → Awards year picker.

### `award_categories`
- Purpose: Normalized category taxonomy.
- Key columns: `id`, `name`.
- Surfaces: Awards import/browse dependencies.

### `award_entries`
- Purpose: Nominations/winners per category and year.
- Key columns: `id`, `award_year_id`, `award_category_id`, `is_winner`.
- Surfaces: Directory → Awards entries.

### `raw_awards`
- Purpose: Raw import staging table for awards data.
- Key columns: `id`, `ceremony_year`, `category`, `film_title`, `person_name`.
- Surfaces: Import pipeline and debug.

## Wellness Domain

### `catalog_ingredients`
- Purpose: Global ingredient catalog used by inventory picker.
- Key columns: `id`, `name`, `category`, `unit_type`, `created_by`.
- Surfaces: Food → Inventory (Add Item).

### `user_ingredients`
- Purpose: User-owned ingredient quantities.
- Key columns: `id`, `user_id`, `ingredient_id`, `quantity`, `unit_type`, `low_stock_threshold`.
- Surfaces: Food → Inventory list, stepper updates, remove flow.

### `catalog_utensils`
- Purpose: Global utensil catalog.
- Key columns: `id`, `name`, `category`, `note`.
- Surfaces: Food → Utensils.

### `user_utensils`
- Purpose: Per-user selected utensil rows linked to catalog utensils.
- Key columns: `id`, `user_id`, `utensil_id`, `count`, `note`, `created_at`.
- Surfaces: Food → Utensils selected list and add/remove modal.

### `catalog_recipes`
- Purpose: Recipe metadata catalog.
- Key columns: `id`, `name`, `meal_type`, `servings`, `total_minutes`, `difficulty`.
- Surfaces: Food → Recipes add modal, Cooking session setup.

### `user_recipes`
- Purpose: Per-user saved recipe rows linked to catalog recipes.
- Key columns: `id`, `user_id`, `recipe_id`, `created_at`.
- Surfaces: Food → Recipes saved list and add/remove modal.

### `catalog_recipe_ingredients`
- Purpose: Recipe ingredient amounts.
- Key columns: `id`, `recipe_id`, `ingredient_id`, `amount`, `unit`.
- Surfaces: Recipe detail composition.

### `catalog_machines`
- Purpose: Gym machine inventory metadata.
- Key columns: `id`, `name`, `zone`, `primary_muscles`.
- Surfaces: Gym → Machines.

### `user_machines`
- Purpose: Per-user selected machine records for personalized gym availability.
- Key columns: `id`, `user_id`, `machine_id`, `is_active`, `notes`.
- Surfaces: Gym → Machines (empty state, add modal, categorized list, remove).

### `catalog_exercises`
- Purpose: Exercise library metadata.
- Key columns: `id`, `name`, `type`, `primary_muscle_group`, `equipment`.
- Surfaces: Gym → Exercises add modal, workout context.

### `user_exercises`
- Purpose: Per-user selected exercise rows linked to catalog exercises.
- Key columns: `id`, `user_id`, `exercise_id`, `created_at`.
- Surfaces: Gym → Exercises selected list and add/remove modal.

### `workout_sessions`
- Purpose: Workout session logs.
- Key columns: `id`, `user_id`, `title`, `started_at`, `ended_at`, `duration_seconds`.
- Surfaces: Sessions history and summaries.

### `workout_sets`
- Purpose: Set-level workout logs.
- Key columns: `id`, `workout_session_id`, `exercise_id`, `set_index`, `reps`, `weight_kg`.
- Surfaces: Workout run logging.

### `metric_definitions`
- Purpose: Metric catalog (body, nutrition, fitness).
- Key columns: `id`, `name`, `unit`, `metric_type`.
- Surfaces: Profile stats/targets.

### `metric_observations`
- Purpose: Time-series metric observations.
- Key columns: `id`, `user_id`, `metric_definition_id`, `observed_at`, `value`.
- Surfaces: Profile trend cards.

### `user_metric_targets`
- Purpose: Per-user target values for tracked metrics.
- Key columns: `id`, `user_id`, `metric_definition_id`, `target_value`, `period`.
- Surfaces: Profile goal settings.

## Core / Shared

### `app_users`
- Purpose: App-level user identity records used by local-auth mapped flows.
- Key columns: `id`, `username`, `name`, `created_at`.
- Surfaces: Auth mapping and wellness user-scoped tables (e.g., Food inventory).
