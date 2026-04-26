function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePositiveDecimal(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed * 100) / 100;
}

function normalizeWeightMode(value) {
  return String(value || '').trim().toLowerCase() === 'fixed' ? 'fixed' : 'steps';
}

function normalizeFixedWeightValues(value) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const unique = new Set();
  rawValues.forEach((item) => {
    const parsed = Number(item);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    unique.add(Math.round(parsed * 100) / 100);
  });
  return Array.from(unique).sort((a, b) => a - b);
}

const MINUTES_ONLY_SLUGS = new Set([
  'plank',
  'side-plank',
  'bike-sprint',
  'rowing-sprint',
  'stair-climb',
]);

const REPS_ONLY_SLUGS = new Set([
  'push-up',
  'pull-up',
  'chin-up',
  'chest-dip',
  'back-extension',
  'hanging-leg-raise',
  'russian-twist',
  'dead-bug',
  'rollout',
]);

export function getExerciseMeasurementConfig(input = {}) {
  const slug = normalize(input?.movementSlug || input?.slug);
  const name = normalize(input?.movementName || input?.name);
  const equipment = normalize(input?.equipment);
  const primaryMuscleGroup = normalize(input?.primaryMuscleGroup || input?.primary_muscle_group);
  const weightStepKg = normalizePositiveDecimal(input?.weightStepKg ?? input?.weight_step_kg, 2.5);
  const weightMode = normalizeWeightMode(input?.weightMeasureMode ?? input?.weight_measure_mode);
  const fixedWeightValues = normalizeFixedWeightValues(input?.weightFixedValues ?? input?.weight_fixed_values);

  if (slug === 'treadmill-run' || name.includes('treadmill')) {
    return {
      mode: 'minutes_speed',
      primaryKey: 'reps',
      primaryLabel: 'Min',
      primaryPlaceholder: 'Min',
      primaryDefaultValue: '5',
      primaryStep: 1,
      primaryAllowsDecimal: false,
      secondaryKey: 'speed',
      secondaryLabel: 'Kph',
      secondaryPlaceholder: 'Kph',
      secondaryDefaultValue: '9',
      secondaryStep: 0.5,
      secondaryAllowsDecimal: true,
    };
  }

  if (
    MINUTES_ONLY_SLUGS.has(slug)
    || name.includes('plank')
    || name.includes('bike sprint')
    || name.includes('rowing sprint')
    || name.includes('stair climb')
    || (primaryMuscleGroup === 'cardio' && equipment === 'machine')
  ) {
    return {
      mode: 'minutes_only',
      primaryKey: 'reps',
      primaryLabel: 'Min',
      primaryPlaceholder: 'Min',
      primaryDefaultValue: '1',
      primaryStep: 1,
      primaryAllowsDecimal: false,
      secondaryKey: null,
      secondaryLabel: null,
      secondaryPlaceholder: null,
      secondaryDefaultValue: null,
      secondaryStep: null,
      secondaryAllowsDecimal: false,
    };
  }

  if (REPS_ONLY_SLUGS.has(slug) || equipment === 'bodyweight') {
    return {
      mode: 'reps_only',
      primaryKey: 'reps',
      primaryLabel: 'Reps',
      primaryPlaceholder: 'Reps',
      primaryDefaultValue: '8',
      primaryStep: 1,
      primaryAllowsDecimal: false,
      secondaryKey: null,
      secondaryLabel: null,
      secondaryPlaceholder: null,
      secondaryDefaultValue: null,
      secondaryStep: null,
      secondaryAllowsDecimal: false,
    };
  }

  return {
    mode: 'reps_weight',
    primaryKey: 'reps',
    primaryLabel: 'Reps',
    primaryPlaceholder: 'Reps',
    primaryDefaultValue: '8',
    primaryStep: 1,
    primaryAllowsDecimal: false,
    secondaryKey: 'weight',
    secondaryLabel: 'Kg',
    secondaryPlaceholder: 'Kg',
    secondaryDefaultValue: '0',
    secondaryStep: weightStepKg,
    secondaryMode: weightMode,
    secondaryFixedValues: fixedWeightValues,
    secondaryAllowsDecimal: true,
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function summarizeMeasuredSets(sets = [], config = getExerciseMeasurementConfig()) {
  const totalSets = sets.length;
  const primaryValues = sets.map((setRow) => toNumber(setRow[config.primaryKey])).filter((value) => value !== null);
  const secondaryValues = config.secondaryKey
    ? sets.map((setRow) => toNumber(setRow[config.secondaryKey])).filter((value) => value !== null)
    : [];

  const primaryLabel = primaryValues.length
    ? (config.mode === 'minutes_only' || config.mode === 'minutes_speed')
      ? `${Math.round(primaryValues.reduce((sum, value) => sum + value, 0) / primaryValues.length)} min`
      : `${Math.round(primaryValues.reduce((sum, value) => sum + value, 0) / primaryValues.length)} reps`
    : (config.mode === 'minutes_only' || config.mode === 'minutes_speed')
      ? 'minutes open'
      : 'reps open';

  const secondaryLabel = config.secondaryKey
    ? secondaryValues.length
      ? `${(secondaryValues.reduce((sum, value) => sum + value, 0) / secondaryValues.length).toFixed(1).replace(/\\.0$/, '')} ${config.mode === 'minutes_speed' ? 'kph avg' : 'kg avg'}`
      : config.mode === 'minutes_speed'
        ? 'speed open'
        : 'weight open'
    : null;

  return `${totalSets} set${totalSets === 1 ? '' : 's'} · ${[primaryLabel, secondaryLabel].filter(Boolean).join(' · ')}`;
}

export function formatMeasuredSetRow(setRow, config = getExerciseMeasurementConfig()) {
  const primaryValue = Math.max(0, Number(setRow?.[config.primaryKey] || 0));
  if (config.mode === 'minutes_only') {
    return `${primaryValue} min`;
  }
  if (config.mode === 'minutes_speed') {
    const secondaryValue = Math.max(0, Number(setRow?.[config.secondaryKey] || 0));
    return `${primaryValue} min • ${secondaryValue} kph`;
  }
  if (!config.secondaryKey) {
    return `${primaryValue} reps`;
  }
  const secondaryValue = Math.max(0, Number(setRow?.[config.secondaryKey] || 0));
  return `${primaryValue} reps • ${secondaryValue} kg`;
}

export function getMeasurementValuePatch(config, value) {
  const sanitized = (config.mode === 'reps_weight' || config.mode === 'minutes_speed')
    ? value.replace(/[^0-9.]/g, '')
    : value.replace(/[^0-9]/g, '');
  return sanitized;
}

export function getMeasurementStepperNextValue({
  config = getExerciseMeasurementConfig(),
  key,
  currentValue,
  delta,
  fallbackValue = '0',
}) {
  if (key === config.secondaryKey && config.mode === 'reps_weight' && config.secondaryMode === 'fixed') {
    const values = config.secondaryFixedValues || [];
    if (!values.length) return String(fallbackValue);

    const currentNumeric = Number(currentValue);
    const safeCurrent = Number.isFinite(currentNumeric) ? currentNumeric : Number(values[0]);

    if (delta > 0) {
      const nextHigher = values.find((value) => value > safeCurrent);
      return String(nextHigher ?? values[values.length - 1]);
    }

    const lowerValues = values.filter((value) => value < safeCurrent);
    return String(lowerValues.length ? lowerValues[lowerValues.length - 1] : values[0]);
  }

  const rawStep = key === config.primaryKey ? config.primaryStep : config.secondaryStep;
  const safeStep = Number(rawStep) > 0 ? Number(rawStep) : 1;
  const baseRaw = currentValue === '' || currentValue === null || currentValue === undefined ? fallbackValue : currentValue;
  const base = Number(baseRaw);
  const next = Math.max(0, (Number.isFinite(base) ? base : Number(fallbackValue) || 0) + (safeStep * delta));
  if (key === config.primaryKey && !config.primaryAllowsDecimal) {
    return String(Math.round(next));
  }
  if (key === config.secondaryKey && !config.secondaryAllowsDecimal) {
    return String(Math.round(next));
  }
  return String(Number(next.toFixed(2)));
}

export function formatMeasurementNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  if (Number.isInteger(numeric)) return String(numeric);
  return String(Number(numeric.toFixed(2)));
}
