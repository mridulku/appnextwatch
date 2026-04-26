import { formatScore, getScoreBand } from '../muscles/scoreBand';
import { buildMuscleStats, sortMappingsByPriorityAndName } from '../muscles/muscleMapping';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankRows(rows, scoreKey = 'relevanceScore') {
  return (rows || []).slice().sort((a, b) => {
    const scoreDiff = Number(b?.[scoreKey] || 0) - Number(a?.[scoreKey] || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return String(a?.item?.name || a?.name || '').localeCompare(String(b?.item?.name || b?.name || ''));
  });
}

function getMachineType(machine) {
  const name = normalizeText(machine?.name);
  const zone = normalizeText(machine?.zone);
  if (zone.includes('cardio') || name.includes('bike') || name.includes('treadmill') || name.includes('row')) {
    return 'Cardio machine';
  }
  if (name.includes('cable') || name.includes('tower') || name.includes('pulldown')) {
    return 'Cable station';
  }
  if (zone.includes('free') || name.includes('bench') || name.includes('platform') || name.includes('smith')) {
    return 'Free-weight support';
  }
  return 'Strength machine';
}

function getExerciseUsageType(exercise) {
  const equipment = normalizeText(exercise?.equipment);
  const type = normalizeText(exercise?.type);
  if (type.includes('cardio')) return 'Cardio effort';
  if (type.includes('mobility')) return 'Mobility drill';
  if (equipment.includes('bodyweight')) return 'Bodyweight movement';
  if (equipment.includes('cable')) return 'Cable movement';
  if (equipment.includes('machine')) return 'Machine movement';
  if (equipment.includes('barbell')) return 'Barbell lift';
  if (equipment.includes('dumbbell')) return 'Dumbbell lift';
  return 'Strength movement';
}

function equipmentCompatibility(machine, exercise) {
  const machineName = normalizeText(machine?.name);
  const zone = normalizeText(machine?.zone);
  const machineText = `${machineName} ${zone}`.trim();
  const equipment = normalizeText(exercise?.equipment);
  const exerciseName = normalizeText(exercise?.name);

  let score = 0;

  if (equipment.includes('machine')) {
    if (machineText.includes('machine')) score += 14;
    if (exerciseName.includes('leg extension') && machineText.includes('leg extension')) score += 28;
    if (exerciseName.includes('leg curl') && machineText.includes('curl')) score += 24;
    if (exerciseName.includes('pec deck') && machineText.includes('pec deck')) score += 30;
    if (exerciseName.includes('preacher') && machineText.includes('preacher')) score += 26;
    if (exerciseName.includes('shoulder press') && machineText.includes('shoulder press')) score += 24;
  }

  if (equipment.includes('cable')) {
    if (machineText.includes('cable') || machineText.includes('tower')) score += 18;
    if (exerciseName.includes('lat pulldown') && machineText.includes('pulldown')) score += 28;
    if (exerciseName.includes('row') && machineText.includes('cable')) score += 14;
  }

  if (equipment.includes('barbell')) {
    if (machineText.includes('bench') || machineText.includes('station')) score += 14;
    if (machineText.includes('smith')) score += 16;
    if (machineText.includes('platform')) score += 10;
  }

  if (equipment.includes('dumbbell')) {
    if (machineText.includes('bench')) score += 12;
    if (machineText.includes('platform')) score += 10;
    if (exerciseName.includes('preacher') && machineText.includes('preacher')) score += 22;
  }

  if (equipment.includes('bodyweight')) {
    if (exerciseName.includes('pull up') || exerciseName.includes('chin up')) {
      if (machineText.includes('pull up') || machineText.includes('assist')) score += 24;
    }
    if (exerciseName.includes('hanging leg raise') && machineText.includes('pull up')) score += 18;
    if (exerciseName.includes('treadmill') && machineText.includes('treadmill')) score += 24;
    if (exerciseName.includes('bike') && machineText.includes('bike')) score += 24;
    if (exerciseName.includes('rowing') && machineText.includes('rowing')) score += 24;
    if (exerciseName.includes('decline') && machineText.includes('decline bench')) score += 14;
  }

  if (exerciseName.includes('bench press')) {
    if (machineText.includes('bench press station')) score += 36;
    if (machineText.includes('smith')) score += 18;
  }
  if (exerciseName.includes('incline')) {
    if (machineText.includes('incline bench')) score += 24;
    if (machineText.includes('incline chest press')) score += 22;
  }
  if (exerciseName.includes('decline')) {
    if (machineText.includes('decline bench')) score += 26;
  }
  if (exerciseName.includes('leg press') && machineText.includes('leg press')) score += 34;
  if (exerciseName.includes('back squat') && machineText.includes('smith')) score += 18;
  if (exerciseName.includes('front squat') && machineText.includes('smith')) score += 18;
  if (exerciseName.includes('overhead press') && machineText.includes('smith')) score += 12;
  if (exerciseName.includes('treadmill') && machineText.includes('treadmill')) score += 40;
  if (exerciseName.includes('bike') && machineText.includes('air bike')) score += 40;
  if (exerciseName.includes('rowing') && machineText.includes('rowing')) score += 40;

  return score;
}

function primaryMuscleAffinity(machine, exercise) {
  const machineTargets = Array.isArray(machine?.primary_muscles)
    ? machine.primary_muscles.map(normalizeText)
    : [];
  const exerciseMuscle = normalizeText(exercise?.primary_muscle_group);
  const exerciseName = normalizeText(exercise?.name);
  let score = 0;

  if (!machineTargets.length) return score;
  if (machineTargets.includes(exerciseMuscle)) score += 24;

  const joined = machineTargets.join(' ');
  if (exerciseMuscle && joined.includes(exerciseMuscle)) score += 14;

  if (exerciseName.includes('chest') && joined.includes('chest')) score += 12;
  if (exerciseName.includes('back') && joined.includes('back')) score += 12;
  if (exerciseName.includes('lat') && (joined.includes('lats') || joined.includes('back'))) score += 12;
  if (exerciseName.includes('curl') && (joined.includes('biceps') || joined.includes('forearms'))) score += 12;
  if (exerciseName.includes('triceps') && joined.includes('triceps')) score += 12;
  if ((exerciseName.includes('squat') || exerciseName.includes('leg')) && (joined.includes('quads') || joined.includes('glutes') || joined.includes('legs'))) score += 14;
  if ((exerciseName.includes('raise') || exerciseName.includes('press')) && joined.includes('delts')) score += 12;
  if (exerciseName.includes('shrug') && joined.includes('traps')) score += 12;
  if (exerciseName.includes('plank') && joined.includes('core')) score += 8;

  return score;
}

function buildMachineExerciseFallback(machine, allExercises, limit = 8) {
  const ranked = (allExercises || []).map((exercise) => {
    const relevanceScore = equipmentCompatibility(machine, exercise) + primaryMuscleAffinity(machine, exercise);
    return {
      exerciseId: exercise.id,
      item: exercise,
      relevanceScore,
      source: 'fallback',
    };
  }).filter((row) => row.relevanceScore >= 60);

  return rankRows(ranked).slice(0, limit);
}

function buildExerciseMachineFallback(exercise, allMachines, limit = 6) {
  const ranked = (allMachines || []).map((machine) => {
    const relevanceScore = equipmentCompatibility(machine, exercise) + primaryMuscleAffinity(machine, exercise);
    return {
      machineId: machine.id,
      item: machine,
      relevanceScore,
      source: 'fallback',
    };
  }).filter((row) => row.relevanceScore >= 60);

  return rankRows(ranked).slice(0, limit);
}

function mergeRankedRows(primaryRows, fallbackRows, idKey) {
  const byId = new Map();
  for (const row of fallbackRows || []) {
    const key = row?.[idKey];
    if (!key) continue;
    byId.set(key, row);
  }
  for (const row of primaryRows || []) {
    const key = row?.[idKey];
    if (!key) continue;
    const existing = byId.get(key);
    if (!existing || Number(row.relevanceScore || 0) >= Number(existing.relevanceScore || 0)) {
      byId.set(key, row);
    }
  }
  return rankRows([...byId.values()]);
}

function summarizeMachine(machine) {
  const usageType = getMachineType(machine);
  const zone = machine?.zone || 'Gym floor';
  const name = machine?.name || 'Machine';

  let summaryText = `${name} is a ${usageType.toLowerCase()} in the ${zone} zone.`;
  if (usageType === 'Cable station') {
    summaryText = `${name} is a versatile cable station that supports a mix of isolation and compound accessory work.`;
  } else if (usageType === 'Cardio machine') {
    summaryText = `${name} is primarily used for conditioning, warm-ups, and steady or interval cardio work.`;
  } else if (usageType === 'Free-weight support') {
    summaryText = `${name} supports free-weight style training and setup-driven compound movements.`;
  } else if (normalizeText(name).includes('pec deck')) {
    summaryText = `${name} is a chest isolation machine with a controlled range of motion and stable setup.`;
  } else if (normalizeText(name).includes('smith')) {
    summaryText = `${name} provides a guided bar path that is useful for presses, squats, and controlled accessory work.`;
  }

  return {
    zone,
    usageType,
    summaryText,
  };
}

function summarizeExercise(exercise) {
  const usageType = getExerciseUsageType(exercise);
  const primaryGroup = exercise?.primary_muscle_group || 'Strength';
  const equipment = exercise?.equipment || 'Bodyweight';
  const type = exercise?.type || 'exercise';

  let summaryText = `${exercise?.name || 'This exercise'} is a ${type} ${usageType.toLowerCase()} focused on ${primaryGroup.toLowerCase()} training.`;
  if (normalizeText(equipment).includes('barbell')) {
    summaryText = `${exercise?.name || 'This exercise'} is a barbell-based movement that usually rewards stable setup and progressive loading.`;
  } else if (normalizeText(equipment).includes('cable')) {
    summaryText = `${exercise?.name || 'This exercise'} is a cable movement that keeps tension on the target muscles throughout the range of motion.`;
  } else if (normalizeText(equipment).includes('bodyweight')) {
    summaryText = `${exercise?.name || 'This exercise'} is a bodyweight movement that is easy to slot into warm-ups, skill work, or conditioning.`;
  } else if (normalizeText(type).includes('mobility')) {
    summaryText = `${exercise?.name || 'This exercise'} is a mobility drill meant to improve movement quality rather than maximize load.`;
  }

  return {
    type,
    equipment,
    usageType,
    summaryText,
  };
}

export function buildMachineDetailModel({
  machine,
  machineExerciseMappings,
  machineMuscleScores,
  allExercises,
  allMachines,
}) {
  const targetedMuscles = rankRows(
    (machineMuscleScores || []).map((row) => ({
      id: row.id,
      name: row.muscle_subgroup?.name || titleCase(row?.muscle_subgroup?.name_key),
      groupName: row.muscle_subgroup?.muscle?.name || 'Muscle',
      targetScore: Number(row.target_score || 0),
      band: getScoreBand(row.target_score),
    })),
    'targetScore',
  );

  const primaryRows = (machineExerciseMappings || []).map((row) => ({
    exerciseId: row.exercise_id,
    item: row.catalog_exercise,
    relevanceScore: Number(row.relevance_score || 0),
    source: 'db',
  }));
  const fallbackRows = buildMachineExerciseFallback(machine, allExercises);
  const recommendedExercises = mergeRankedRows(primaryRows, fallbackRows, 'exerciseId').slice(0, 8);

  const alternatives = rankRows(
    (allMachines || [])
      .filter((entry) => entry?.id && entry.id !== machine?.id)
      .map((entry) => ({
        machineId: entry.id,
        item: entry,
        relevanceScore:
          (normalizeText(entry.zone) === normalizeText(machine?.zone) ? 18 : 0) +
          primaryMuscleAffinity(entry, { primary_muscle_group: (machine?.primary_muscles || [])[0], name: machine?.name }) +
          (getMachineType(entry) === getMachineType(machine) ? 22 : 0),
      }))
      .filter((row) => row.relevanceScore >= 30),
    'relevanceScore',
  ).slice(0, 3);

  return {
    machine,
    hero: {
      title: machine?.name || 'Machine',
      subtitle: `${machine?.zone || 'Gym Zone'} • ${Array.isArray(machine?.primary_muscles) && machine.primary_muscles.length ? machine.primary_muscles.join(', ') : 'Strength'}`,
      imageSource: machine?.image_url ? { uri: machine.image_url } : null,
    },
    targetedMuscles: targetedMuscles.length
      ? targetedMuscles
      : uniqueBy((machine?.primary_muscles || []).map((name, index) => ({
        id: `fallback-${index}`,
        name,
        groupName: 'Primary target',
        targetScore: 0,
        band: null,
      })), (entry) => entry.name),
    recommendedExercises,
    fitSummary: summarizeMachine(machine),
    relatedMachines: alternatives,
  };
}

export function buildExerciseDetailModel({
  exercise,
  exerciseMuscleScores,
  exerciseMachineMappings,
  allMachines,
}) {
  const targetMuscles = rankRows(
    (exerciseMuscleScores || []).map((row) => ({
      id: row.id,
      subgroupId: row.muscle_subgroup?.id || row.muscle_subgroup_id,
      subgroupKey: row.muscle_subgroup?.name_key || '',
      groupKey: row.muscle_subgroup?.muscle?.name_key || '',
      subgroupName: row.muscle_subgroup?.name || titleCase(row?.muscle_subgroup?.name_key),
      groupName: row.muscle_subgroup?.muscle?.name || 'Muscle',
      imageUrl: row.muscle_subgroup?.image_url || row.muscle_subgroup?.muscle?.image_url || null,
      targetScore: Number(row.target_score || 0),
      band: getScoreBand(row.target_score),
    })),
    'targetScore',
  );

  const primaryRows = (exerciseMachineMappings || []).map((row) => ({
    machineId: row.machine_id,
    item: row.catalog_machine,
    relevanceScore: Number(row.relevance_score || 0),
    source: 'db',
  }));
  const fallbackRows = buildExerciseMachineFallback(exercise, allMachines);
  const recommendedMachines = mergeRankedRows(primaryRows, fallbackRows, 'machineId').slice(0, 6);

  return {
    exercise,
    targetMuscles,
    recommendedMachines,
    learningLink: {
      youtubeId: 'dQw4w9WgXcQ',
    },
    exerciseSummary: summarizeExercise(exercise),
  };
}

export function buildMuscleDetailModel({
  subgroup,
  group,
  exerciseMaps,
  machineMaps,
  machineExerciseMappings,
  allMachines,
  sessionHistory,
}) {
  const bestSubgroupByExerciseId = (exerciseMaps || []).reduce((acc, row) => {
    const score = Number.isFinite(Number(row?.target_score))
      ? Number(row.target_score)
      : (row?.is_primary ? 80 : 0);
    const current = acc[row.exercise_id];
    if (!current || score > current.score) {
      acc[row.exercise_id] = {
        score,
        muscle_subgroup_id: row.muscle_subgroup_id,
      };
    }
    return acc;
  }, {});

  const mappedExercises = sortMappingsByPriorityAndName(
    (exerciseMaps || []).filter((row) => {
      if (row.muscle_subgroup_id !== subgroup?.id) return false;
      return bestSubgroupByExerciseId[row.exercise_id]?.muscle_subgroup_id === subgroup?.id;
    }),
    'catalog_exercise',
  );

  const stats = buildMuscleStats({
    mappedExercises: mappedExercises.map((row) => row.catalog_exercise).filter(Boolean),
    sessionHistory,
  });

  const directMachineRows = rankRows(
    (machineMaps || [])
      .filter((row) => row.muscle_subgroup_id === subgroup?.id)
      .map((row) => ({
        machineId: row.machine_id,
        item: row.catalog_machine,
        relevanceScore: Number(row.target_score || 0),
        source: 'db',
      })),
  );

  const mappedExerciseIds = new Set(mappedExercises.map((row) => row.exercise_id).filter(Boolean));
  const fallbackMachineRows = rankRows(
    (machineExerciseMappings || [])
      .filter((row) => mappedExerciseIds.has(row.exercise_id))
      .map((row) => ({
        machineId: row.machine_id,
        item: (allMachines || []).find((entry) => entry.id === row.machine_id) || null,
        relevanceScore: Number(row.relevance_score || 0),
        source: 'fallback',
      }))
      .filter((row) => row.item && row.relevanceScore >= 60),
  );

  const relatedMachines = mergeRankedRows(directMachineRows, fallbackMachineRows, 'machineId').slice(0, 5);

  let trainingNote = null;
  if (stats.suggestedFocus === 'Due') {
    trainingNote = 'Suggested focus: this area has not been trained recently.';
  } else if (stats.setsThisWeek >= 12) {
    trainingNote = 'Recent work is already high here, so recovery and exercise variety may matter more.';
  } else if (relatedMachines.length >= 3) {
    trainingNote = 'Good machine support is available in your current gym for this target area.';
  }

  return {
    subgroup,
    group,
    stats,
    mappedExercises,
    relatedMachines,
    trainingNote,
  };
}

export { formatScore, getScoreBand };
