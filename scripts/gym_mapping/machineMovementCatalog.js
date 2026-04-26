const MACHINE_MOVEMENT_CATALOG = [
  {
    machine_name: 'Pec Deck',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'chest-fly', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Pec deck fly station.' },
      { movement_slug: 'rear-delt-fly', allowed_variant_labels: ['Machine'], relevance_score: 92, rationale: 'Reverse pec deck setup.' },
    ],
  },
  {
    machine_name: 'Incline Chest Press Machine',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'incline-press', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Dedicated incline chest press path.' },
    ],
  },
  {
    machine_name: 'Bench Press Station',
    machine_mode: 'support_station',
    allowed_movements: [
      { movement_slug: 'flat-press', allowed_variant_labels: ['Barbell'], relevance_score: 90, rationale: 'Flat bench barbell pressing setup.' },
      { movement_slug: 'close-grip-press', allowed_variant_labels: ['Barbell'], relevance_score: 88, rationale: 'Same station supports close-grip barbell pressing.' },
    ],
  },
  {
    machine_name: 'Incline Bench',
    machine_mode: 'support_station',
    allowed_movements: [
      { movement_slug: 'incline-press', allowed_variant_labels: ['Dumbbell'], relevance_score: 85, rationale: 'Incline dumbbell pressing bench support.' },
    ],
  },
  {
    machine_name: 'Lat Pulldown Machine',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'lat-pulldown', allowed_variant_labels: ['Standard Cable', 'Wide Grip Cable', 'Close Grip Cable'], relevance_score: 95, rationale: 'Dedicated pulldown station.' },
    ],
  },
  {
    machine_name: 'Cable Tower',
    machine_mode: 'multi_use_cable',
    allowed_movements: [
      { movement_slug: 'chest-fly', allowed_variant_labels: ['Cable'], relevance_score: 80, rationale: 'Cable fly setup.' },
      { movement_slug: 'incline-fly', allowed_variant_labels: ['Cable'], relevance_score: 80, rationale: 'High-to-low / incline cable fly setup.' },
      { movement_slug: 'lat-pulldown', allowed_variant_labels: ['Standard Cable', 'Wide Grip Cable', 'Close Grip Cable'], relevance_score: 80, rationale: 'Top pulley cable pulldown option.' },
      { movement_slug: 'seated-row', allowed_variant_labels: ['Cable'], relevance_score: 80, rationale: 'Low pulley seated row attachment.' },
      { movement_slug: 'face-pull', allowed_variant_labels: ['Cable'], relevance_score: 80, rationale: 'Rope face pull attachment.' },
      { movement_slug: 'lateral-raise', allowed_variant_labels: ['Cable'], relevance_score: 80, rationale: 'Single-handle cable lateral raise.' },
      { movement_slug: 'curl', allowed_variant_labels: ['Cable'], relevance_score: 80, rationale: 'Cable curl attachment.' },
      { movement_slug: 'triceps-pushdown', allowed_variant_labels: ['Cable'], relevance_score: 80, rationale: 'Standard pushdown setup.' },
      { movement_slug: 'overhead-triceps-extension', allowed_variant_labels: ['Cable Rope'], relevance_score: 80, rationale: 'Cable rope overhead triceps extension.' },
      { movement_slug: 'crunch', allowed_variant_labels: ['Cable'], relevance_score: 80, rationale: 'Cable crunch setup.' },
      { movement_slug: 'pallof-press', allowed_variant_labels: ['Cable'], relevance_score: 80, rationale: 'Anti-rotation cable setup.' },
    ],
  },
  {
    machine_name: 'Assisted Pull-up Machine',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'pull-up', allowed_variant_labels: ['Assisted Machine'], relevance_score: 95, rationale: 'Assisted pull-up station.' },
      { movement_slug: 'chin-up', allowed_variant_labels: ['Assisted Machine'], relevance_score: 95, rationale: 'Assisted chin-up station.' },
    ],
  },
  {
    machine_name: 'Back Extension Bench',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'back-extension', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Roman chair / back extension setup.' },
    ],
  },
  {
    machine_name: 'Leg Press Machine',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'leg-press', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Dedicated leg press machine.' },
    ],
  },
  {
    machine_name: 'Leg Extension Machine',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'leg-extension', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Dedicated leg extension machine.' },
    ],
  },
  {
    machine_name: 'Abduction/Adduction Machine',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'hip-abduction', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Hip abduction seat setup.' },
      { movement_slug: 'hip-adduction', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Hip adduction seat setup.' },
    ],
  },
  {
    machine_name: 'Glute Drive Machine',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'hip-thrust', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Glute drive / thrust machine.' },
    ],
  },
  {
    machine_name: 'Smith Machine',
    machine_mode: 'guided_bar',
    allowed_movements: [
      { movement_slug: 'flat-press', allowed_variant_labels: ['Smith'], relevance_score: 88, rationale: 'Guided smith flat press.' },
      { movement_slug: 'squat', allowed_variant_labels: ['Smith'], relevance_score: 88, rationale: 'Guided smith squat.' },
      { movement_slug: 'overhead-press', allowed_variant_labels: ['Smith'], relevance_score: 85, rationale: 'Guided smith overhead press.' },
    ],
  },
  {
    machine_name: 'Shoulder Press Machine',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'overhead-press', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Dedicated machine shoulder press.' },
    ],
  },
  {
    machine_name: 'Preacher Curl Machine',
    machine_mode: 'dedicated_machine',
    allowed_movements: [
      { movement_slug: 'curl', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Preacher curl station.' },
    ],
  },
  {
    machine_name: 'Decline Bench',
    machine_mode: 'support_station',
    allowed_movements: [
      { movement_slug: 'decline-press', allowed_variant_labels: ['Barbell'], relevance_score: 85, rationale: 'Decline bench pressing setup.' },
    ],
  },
  {
    machine_name: 'Free Weights Platform',
    machine_mode: 'support_surface',
    allowed_movements: [],
  },
  {
    machine_name: 'Treadmill',
    machine_mode: 'cardio_machine',
    allowed_movements: [
      { movement_slug: 'treadmill-run', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Dedicated treadmill running.' },
    ],
  },
  {
    machine_name: 'Stair Climber',
    machine_mode: 'cardio_machine',
    allowed_movements: [
      { movement_slug: 'stair-climb', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Dedicated stair climbing cardio.' },
    ],
  },
  {
    machine_name: 'Rowing Machine',
    machine_mode: 'cardio_machine',
    allowed_movements: [
      { movement_slug: 'rowing-sprint', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Row erg sprinting.' },
    ],
  },
  {
    machine_name: 'Air Bike',
    machine_mode: 'cardio_machine',
    allowed_movements: [
      { movement_slug: 'bike-sprint', allowed_variant_labels: ['Machine'], relevance_score: 95, rationale: 'Air bike sprint intervals.' },
    ],
  },
];

module.exports = {
  MACHINE_MOVEMENT_CATALOG,
};
