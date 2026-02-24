export const DAY_CATEGORY_ORDER = ['Push', 'Pull', 'Legs', 'General'];

function normalize(value) {
  return String(value || '').toLowerCase();
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function collectDayTags(tokens) {
  const tags = new Set();

  tokens.forEach((token) => {
    const text = normalize(token);
    if (!text) return;

    const isPush = hasAny(text, [
      'chest',
      'pec',
      'shoulder',
      'delt',
      'tricep',
      'press',
    ]);

    const isPull = hasAny(text, [
      'back',
      'lat',
      'row',
      'bicep',
      'rear delt',
      'trap',
      'rhomboid',
      'pull',
    ]);

    const isLegs = hasAny(text, [
      'leg',
      'quad',
      'hamstring',
      'glute',
      'calf',
      'squat',
      'lunge',
    ]);

    if (isPush) tags.add('Push');
    if (isPull) tags.add('Pull');
    if (isLegs) tags.add('Legs');
  });

  return tags;
}

export function resolveDayCategory(tokens) {
  const tags = collectDayTags(tokens);
  if (tags.size === 1) return [...tags][0];
  return 'General';
}

export function classifyExerciseForDay(exercise) {
  const primary = normalize(exercise?.primary_muscle_group);
  const name = normalize(exercise?.name);

  if (primary.includes('legs')) return 'Legs';
  if (primary.includes('chest') || primary.includes('shoulder')) return 'Push';
  if (primary.includes('back')) return 'Pull';
  if (primary.includes('core') || primary.includes('cardio') || primary.includes('mobility')) return 'General';
  if (primary.includes('arms')) {
    if (name.includes('tricep')) return 'Push';
    if (name.includes('bicep') || name.includes('curl')) return 'Pull';
    return 'General';
  }

  if (name.includes('leg press') || name.includes('squat') || name.includes('lunge') || name.includes('deadlift')) {
    return 'Legs';
  }

  return resolveDayCategory([
    exercise?.primary_muscle_group,
    exercise?.name,
    exercise?.type,
    exercise?.equipment,
  ]);
}

export function classifyMachineForDay(machine) {
  const muscleTokens = Array.isArray(machine?.primary_muscles) ? machine.primary_muscles : [];
  return resolveDayCategory([
    machine?.name,
    machine?.zone,
    ...muscleTokens,
  ]);
}

export function classifyMuscleForDay(muscle) {
  return resolveDayCategory([
    muscle?.name,
    muscle?.name_key,
  ]);
}
