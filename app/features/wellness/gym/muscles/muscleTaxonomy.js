export const MUSCLE_GROUPS = [
  {
    key: 'chest',
    label: 'Chest',
    icon: 'fitness-outline',
    subgroups: [
      { key: 'upper_chest', label: 'Upper Chest', muscleKeys: ['upper_chest'] },
      { key: 'mid_chest', label: 'Mid Chest', muscleKeys: ['mid_chest', 'chest'] },
      { key: 'lower_chest', label: 'Lower Chest', muscleKeys: ['lower_chest'] },
    ],
  },
  {
    key: 'back',
    label: 'Back',
    icon: 'body-outline',
    subgroups: [
      { key: 'lats', label: 'Lats', muscleKeys: ['lats'] },
      { key: 'upper_back', label: 'Upper Back', muscleKeys: ['upper_back', 'traps'] },
      { key: 'mid_back', label: 'Mid Back', muscleKeys: ['mid_back'] },
      { key: 'lower_back', label: 'Lower Back', muscleKeys: ['lower_back'] },
      { key: 'traps', label: 'Traps', muscleKeys: ['traps', 'upper_back'] },
    ],
  },
  {
    key: 'legs',
    label: 'Legs',
    icon: 'walk-outline',
    subgroups: [
      { key: 'quads', label: 'Quads', muscleKeys: ['quads'] },
      { key: 'hamstrings', label: 'Hamstrings', muscleKeys: ['hamstrings'] },
      { key: 'glutes', label: 'Glutes', muscleKeys: ['glutes'] },
      { key: 'calves', label: 'Calves', muscleKeys: ['calves'] },
    ],
  },
  {
    key: 'shoulders',
    label: 'Shoulders',
    icon: 'barbell-outline',
    subgroups: [
      { key: 'front_delts', label: 'Front Delts', muscleKeys: ['front_delts'] },
      { key: 'side_delts', label: 'Side Delts', muscleKeys: ['side_delts'] },
      { key: 'rear_delts', label: 'Rear Delts', muscleKeys: ['rear_delts'] },
    ],
  },
  {
    key: 'arms',
    label: 'Arms',
    icon: 'barbell-outline',
    subgroups: [
      { key: 'biceps', label: 'Biceps', muscleKeys: ['biceps'] },
      { key: 'triceps', label: 'Triceps', muscleKeys: ['triceps'] },
      { key: 'forearms', label: 'Forearms', muscleKeys: ['forearms'] },
    ],
  },
  {
    key: 'core',
    label: 'Core',
    icon: 'shield-outline',
    subgroups: [
      { key: 'abs', label: 'Abs', muscleKeys: ['abs'] },
      { key: 'obliques', label: 'Obliques', muscleKeys: ['obliques'] },
      { key: 'lower_abs', label: 'Lower Abs', muscleKeys: ['lower_abs'] },
    ],
  },
];

export const MUSCLE_GROUP_ORDER = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
];

export function getMuscleGroupByKey(groupKey) {
  return MUSCLE_GROUPS.find((group) => group.key === groupKey) || null;
}

export function getMuscleSubgroupByKey(groupKey, subKey) {
  const group = getMuscleGroupByKey(groupKey);
  if (!group) return null;
  return group.subgroups.find((subgroup) => subgroup.key === subKey) || null;
}
