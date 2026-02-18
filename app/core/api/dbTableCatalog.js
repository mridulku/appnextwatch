export const DB_TABLE_GROUPS = [
  {
    id: 'movies',
    title: 'Movies',
    icon: 'film-outline',
    tables: [
      {
        name: 'movies',
        description: 'Movie catalog with metadata, ratings, and media links.',
        surfaces: ['Movies > Explore', 'Movies > Directory', 'Movie detail'],
        keyColumns: ['id', 'title', 'year', 'genre', 'rating', 'overview'],
      },
      {
        name: 'actors',
        description: 'Actor directory records used in talent browsing.',
        surfaces: ['Movies > Directory > Actors', 'Actor detail'],
        keyColumns: ['id', 'name', 'sort_name', 'role_type', 'bio'],
      },
      {
        name: 'directors',
        description: 'Director directory records used in talent browsing.',
        surfaces: ['Movies > Directory > Directors', 'Director detail'],
        keyColumns: ['id', 'name', 'sort_name', 'bio'],
      },
      {
        name: 'movie_actors',
        description: 'Join table linking movies and actors with credit metadata.',
        surfaces: ['Actor credits', 'Movie cast view'],
        keyColumns: ['movie_id', 'actor_id', 'character_name', 'billing_order'],
      },
      {
        name: 'movie_directors',
        description: 'Join table linking movies and directors.',
        surfaces: ['Director credits', 'Movie crew view'],
        keyColumns: ['movie_id', 'director_id'],
      },
      {
        name: 'awards',
        description: 'Legacy awards records tied to movies.',
        surfaces: ['Data inspector / awards'],
        keyColumns: ['id', 'year', 'category', 'winner', 'movie_id'],
      },
      {
        name: 'award_shows',
        description: 'Award ceremony definitions (e.g., Oscars).',
        surfaces: ['Directory > Awards'],
        keyColumns: ['id', 'name'],
      },
      {
        name: 'award_years',
        description: 'Per-show ceremony years.',
        surfaces: ['Directory > Awards > year picker'],
        keyColumns: ['id', 'show_id', 'year'],
      },
      {
        name: 'award_entries',
        description: 'Nominee and winner entries per category/year.',
        surfaces: ['Directory > Awards > entries'],
        keyColumns: ['id', 'award_year_id', 'award_category_id', 'is_winner'],
      },
      {
        name: 'award_categories',
        description: 'Normalized award category dimension.',
        surfaces: ['Award import / awards browse'],
        keyColumns: ['id', 'name'],
      },
      {
        name: 'raw_awards',
        description: 'Raw imported awards feed before normalization.',
        surfaces: ['Import pipeline / debug'],
        keyColumns: ['id', 'ceremony_year', 'category', 'film_title', 'person_name'],
      },
    ],
  },
  {
    id: 'wellness',
    title: 'Wellness',
    icon: 'barbell-outline',
    tables: [
      {
        name: 'catalog_ingredients',
        description: 'Global ingredient catalog used by Food inventory.',
        surfaces: ['Food > Inventory > Add Item picker'],
        keyColumns: ['id', 'name', 'category', 'unit_type', 'created_by'],
      },
      {
        name: 'user_ingredients',
        description: 'Per-user inventory rows linked to catalog ingredients.',
        surfaces: ['Food > Inventory list', 'Food > Inventory steppers/remove'],
        keyColumns: ['id', 'user_id', 'ingredient_id', 'quantity', 'unit_type'],
      },
      {
        name: 'catalog_utensils',
        description: 'Global utensil catalog entries.',
        surfaces: ['Food > Utensils'],
        keyColumns: ['id', 'name', 'category', 'note'],
      },
      {
        name: 'user_utensils',
        description: 'Per-user utensil selection rows linked to catalog utensils.',
        surfaces: ['Food > Utensils selected list', 'Food > Utensils add/remove modal'],
        keyColumns: ['id', 'user_id', 'utensil_id', 'count', 'note', 'created_at'],
      },
      {
        name: 'user_machines',
        description: 'Per-user selected machine list for gym personalization.',
        surfaces: ['Gym > Machines'],
        keyColumns: ['id', 'user_id', 'machine_id', 'is_active', 'notes'],
      },
      {
        name: 'catalog_recipes',
        description: 'Recipe catalog with meal type and timing metadata.',
        surfaces: ['Food > Recipes add modal', 'Cooking sessions'],
        keyColumns: ['id', 'name', 'meal_type', 'servings', 'total_minutes'],
      },
      {
        name: 'user_recipes',
        description: 'Per-user saved recipes linked to catalog recipe rows.',
        surfaces: ['Food > Recipes saved list', 'Food > Recipes add/remove modal'],
        keyColumns: ['id', 'user_id', 'recipe_id', 'created_at'],
      },
      {
        name: 'catalog_recipe_ingredients',
        description: 'Recipe-to-ingredient mapping rows with amounts.',
        surfaces: ['Food > Recipes detail'],
        keyColumns: ['id', 'recipe_id', 'ingredient_id', 'amount', 'unit'],
      },
      {
        name: 'catalog_machines',
        description: 'Gym machine inventory by zone and muscle groups.',
        surfaces: ['Gym > Machines'],
        keyColumns: ['id', 'name', 'zone', 'primary_muscles'],
      },
      {
        name: 'catalog_exercises',
        description: 'Exercise library with type/equipment/muscle metadata.',
        surfaces: ['Gym > Exercises add modal', 'Workout sessions'],
        keyColumns: ['id', 'name', 'type', 'primary_muscle_group', 'equipment'],
      },
      {
        name: 'user_exercises',
        description: 'Per-user selected exercise list linked to catalog exercises.',
        surfaces: ['Gym > Exercises selected list', 'Gym > Exercises add/remove modal'],
        keyColumns: ['id', 'user_id', 'exercise_id', 'created_at'],
      },
      {
        name: 'workout_sessions',
        description: 'Workout session logs per user.',
        surfaces: ['Sessions > Workout summary'],
        keyColumns: ['id', 'user_id', 'title', 'started_at', 'duration_seconds'],
      },
      {
        name: 'workout_sets',
        description: 'Per-set workout performance linked to sessions.',
        surfaces: ['Sessions > Workout logging'],
        keyColumns: ['id', 'workout_session_id', 'exercise_id', 'set_index', 'reps', 'weight_kg'],
      },
      {
        name: 'metric_definitions',
        description: 'Metric catalog for nutrition/body/fitness tracking.',
        surfaces: ['Profile stats + targets'],
        keyColumns: ['id', 'name', 'unit', 'metric_type'],
      },
      {
        name: 'metric_observations',
        description: 'Observed metric measurements over time.',
        surfaces: ['Profile trends'],
        keyColumns: ['id', 'user_id', 'metric_definition_id', 'observed_at', 'value'],
      },
      {
        name: 'user_metric_targets',
        description: 'Per-user targets for metrics (weight, macros, etc.).',
        surfaces: ['Profile > Body/Food targets'],
        keyColumns: ['id', 'user_id', 'metric_definition_id', 'target_value', 'period'],
      },
    ],
  },
  {
    id: 'shared',
    title: 'Core / Shared',
    icon: 'layers-outline',
    tables: [
      {
        name: 'app_users',
        description: 'Application-level user mapping for local app identity.',
        surfaces: ['Login identity mapping', 'Food inventory user scope'],
        keyColumns: ['id', 'username', 'name', 'created_at'],
      },
    ],
  },
];

export const DB_TABLE_LOOKUP = Object.fromEntries(
  DB_TABLE_GROUPS.flatMap((group) =>
    group.tables.map((table) => [table.name, { ...table, groupId: group.id, groupTitle: group.title }]),
  ),
);

export const ALL_DB_TABLES = DB_TABLE_GROUPS.flatMap((group) => group.tables.map((table) => table.name));

export function getDbTableMeta(name) {
  return DB_TABLE_LOOKUP[name] || null;
}
