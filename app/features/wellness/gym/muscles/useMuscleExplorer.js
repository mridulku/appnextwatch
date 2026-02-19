import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  listMuscles,
  listMuscleExerciseMappings,
  listMuscleMachineMappings,
  listMuscleSubgroups,
} from '../../../../core/api/musclesDb';
import { loadSessionHistory } from '../../../../core/storage/sessionHistoryStorage';
import { MUSCLE_GROUP_ORDER } from './muscleTaxonomy';

function orderMuscles(rows) {
  return rows
    .slice()
    .sort((a, b) => {
      const orderA = MUSCLE_GROUP_ORDER.indexOf(a.name_key);
      const orderB = MUSCLE_GROUP_ORDER.indexOf(b.name_key);
      const safeA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
      const safeB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;
      if (safeA !== safeB) return safeA - safeB;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
}

function isTableMissingError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('relation') && message.includes('does not exist');
}

export default function useMuscleExplorer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [muscles, setMuscles] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [exerciseMaps, setExerciseMaps] = useState([]);
  const [machineMaps, setMachineMaps] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [muscleRows, subgroupRows, exerciseMapRows, machineMapRows, historyRows] =
        await Promise.all([
          listMuscles(),
          listMuscleSubgroups(),
          listMuscleExerciseMappings(),
          listMuscleMachineMappings(),
          loadSessionHistory(),
        ]);

      setMuscles(orderMuscles(muscleRows || []));
      setSubgroups(subgroupRows || []);
      setExerciseMaps(exerciseMapRows || []);
      setMachineMaps(machineMapRows || []);
      setSessionHistory(historyRows || []);
    } catch (nextError) {
      const tableHint = isTableMissingError(nextError)
        ? 'Run migration + seed: node scripts/seed_muscles_and_mappings.js'
        : '';
      setError(
        `${nextError?.message || 'Unable to load muscle explorer data.'}${tableHint ? `\n${tableHint}` : ''}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const subgroupById = useMemo(
    () => Object.fromEntries(subgroups.map((subgroup) => [subgroup.id, subgroup])),
    [subgroups],
  );

  return {
    loading,
    error,
    muscles,
    subgroups,
    subgroupById,
    exerciseMaps,
    machineMaps,
    sessionHistory,
    refresh: hydrate,
  };
}
