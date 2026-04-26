import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  listCatalogExercisesLite,
  listCatalogMachinesLite,
  listMachineExerciseMappingsLite,
  listMuscleExerciseMappings,
  listMuscleMachineMappings,
  listMuscleSubgroups,
  listMuscles,
} from '../../../../core/api/musclesDb';
import { DEFAULT_LIBRARY_FILTER_STATE, LIBRARY_ENTITY_TYPES } from './types';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function setToArray(value) {
  return value instanceof Set ? [...value] : [];
}

function hasIntersection(setLike, selected) {
  if (!selected?.length) return true;
  if (!(setLike instanceof Set) || !setLike.size) return false;
  return selected.some((id) => setLike.has(id));
}

function hasOwnSelection(id, selected) {
  if (!selected?.length) return true;
  return selected.includes(id);
}

function rowMatchesQuery(textFields, query) {
  if (!query) return true;
  return textFields.some((field) => normalize(field).includes(query));
}

export default function useLibraryExplorer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedMuscleIds, setSelectedMuscleIds] = useState(DEFAULT_LIBRARY_FILTER_STATE.selectedMuscleIds);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState(DEFAULT_LIBRARY_FILTER_STATE.selectedExerciseIds);
  const [selectedMachineIds, setSelectedMachineIds] = useState(DEFAULT_LIBRARY_FILTER_STATE.selectedMachineIds);

  const [muscles, setMuscles] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [machines, setMachines] = useState([]);
  const [muscleExerciseMaps, setMuscleExerciseMaps] = useState([]);
  const [machineExerciseMaps, setMachineExerciseMaps] = useState([]);
  const [muscleMachineMaps, setMuscleMachineMaps] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(normalize(queryInput));
    }, 280);
    return () => clearTimeout(timer);
  }, [queryInput]);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setWarning('');

      const [muscleRows, subgroupRows, exerciseRows, machineRows] = await Promise.all([
        listMuscles(),
        listMuscleSubgroups(),
        listCatalogExercisesLite(),
        listCatalogMachinesLite(),
      ]);

      setMuscles(muscleRows || []);
      setSubgroups(subgroupRows || []);
      setExercises(exerciseRows || []);
      setMachines(machineRows || []);

      try {
        const [muscleExerciseRows, machineExerciseRows, muscleMachineRows] = await Promise.all([
          listMuscleExerciseMappings(),
          listMachineExerciseMappingsLite(),
          listMuscleMachineMappings(),
        ]);
        setMuscleExerciseMaps(muscleExerciseRows || []);
        setMachineExerciseMaps(machineExerciseRows || []);
        setMuscleMachineMaps(muscleMachineRows || []);
      } catch (mappingError) {
        setMuscleExerciseMaps([]);
        setMachineExerciseMaps([]);
        setMuscleMachineMaps([]);
        setWarning(mappingError?.message || 'Mapping tables unavailable. Showing search-only results.');
      }
    } catch (nextError) {
      setError(nextError?.message || 'Could not load library data.');
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

  const muscleById = useMemo(
    () => Object.fromEntries((muscles || []).map((row) => [row.id, row])),
    [muscles],
  );

  const subgroupRows = useMemo(
    () =>
      (subgroups || []).map((row) => {
        const parent = muscleById[row.muscle_id];
        return {
          id: row.id,
          muscleId: row.muscle_id,
          subgroupLabel: row.name,
          subgroupKey: row.name_key,
          groupLabel: parent?.name || 'Muscle',
          groupKey: parent?.name_key || '',
          image_url: row.image_url || parent?.image_url || null,
          searchText: normalize([row.name, row.name_key, parent?.name, parent?.name_key].join(' ')),
        };
      }),
    [subgroups, muscleById],
  );

  const graphIndexes = useMemo(() => {
    const subgroupToExercises = new Map();
    const exerciseToSubgroups = new Map();
    const machineToExercises = new Map();
    const exerciseToMachines = new Map();
    const subgroupToMachinesDirect = new Map();

    (muscleExerciseMaps || []).forEach((row) => {
      if (!row?.muscle_subgroup_id || !row?.exercise_id) return;
      if (!subgroupToExercises.has(row.muscle_subgroup_id)) subgroupToExercises.set(row.muscle_subgroup_id, new Set());
      if (!exerciseToSubgroups.has(row.exercise_id)) exerciseToSubgroups.set(row.exercise_id, new Set());
      subgroupToExercises.get(row.muscle_subgroup_id).add(row.exercise_id);
      exerciseToSubgroups.get(row.exercise_id).add(row.muscle_subgroup_id);
    });

    (machineExerciseMaps || []).forEach((row) => {
      if (!row?.machine_id || !row?.exercise_id) return;
      if (!machineToExercises.has(row.machine_id)) machineToExercises.set(row.machine_id, new Set());
      if (!exerciseToMachines.has(row.exercise_id)) exerciseToMachines.set(row.exercise_id, new Set());
      machineToExercises.get(row.machine_id).add(row.exercise_id);
      exerciseToMachines.get(row.exercise_id).add(row.machine_id);
    });

    (muscleMachineMaps || []).forEach((row) => {
      if (!row?.muscle_subgroup_id || !row?.machine_id) return;
      if (!subgroupToMachinesDirect.has(row.muscle_subgroup_id)) subgroupToMachinesDirect.set(row.muscle_subgroup_id, new Set());
      subgroupToMachinesDirect.get(row.muscle_subgroup_id).add(row.machine_id);
    });

    const subgroupToMachinesDerived = new Map();
    subgroupToExercises.forEach((exerciseIds, subgroupId) => {
      const machineIds = new Set(subgroupToMachinesDirect.get(subgroupId) || []);
      exerciseIds.forEach((exerciseId) => {
        (exerciseToMachines.get(exerciseId) || new Set()).forEach((machineId) => {
          machineIds.add(machineId);
        });
      });
      subgroupToMachinesDerived.set(subgroupId, machineIds);
    });

    const machineToSubgroupsDerived = new Map();
    machineToExercises.forEach((exerciseIds, machineId) => {
      const subgroupIds = new Set();
      exerciseIds.forEach((exerciseId) => {
        (exerciseToSubgroups.get(exerciseId) || new Set()).forEach((subgroupId) => subgroupIds.add(subgroupId));
      });
      machineToSubgroupsDerived.set(machineId, subgroupIds);
    });

    return {
      subgroupToExercises,
      exerciseToSubgroups,
      machineToExercises,
      exerciseToMachines,
      subgroupToMachinesDerived,
      machineToSubgroupsDerived,
    };
  }, [muscleExerciseMaps, muscleMachineMaps, machineExerciseMaps]);

  const filteredMuscles = useMemo(() => {
    const rows = subgroupRows.filter((row) => {
      const linkedExercises = graphIndexes.subgroupToExercises.get(row.id) || new Set();
      const linkedMachines = graphIndexes.subgroupToMachinesDerived.get(row.id) || new Set();

      if (!hasOwnSelection(row.id, selectedMuscleIds)) return false;
      if (!hasIntersection(linkedExercises, selectedExerciseIds)) return false;
      if (!hasIntersection(linkedMachines, selectedMachineIds)) return false;
      if (!rowMatchesQuery([row.searchText], query)) return false;
      return true;
    });

    return rows
      .map((row) => ({
        ...row,
        exerciseCount: (graphIndexes.subgroupToExercises.get(row.id) || new Set()).size,
        machineCount: (graphIndexes.subgroupToMachinesDerived.get(row.id) || new Set()).size,
      }))
      .sort((a, b) => a.subgroupLabel.localeCompare(b.subgroupLabel));
  }, [graphIndexes.subgroupToExercises, graphIndexes.subgroupToMachinesDerived, query, selectedExerciseIds, selectedMachineIds, selectedMuscleIds, subgroupRows]);

  const filteredExercises = useMemo(() => {
    return (exercises || [])
      .filter((row) => {
        const linkedSubgroups = graphIndexes.exerciseToSubgroups.get(row.id) || new Set();
        const linkedMachines = graphIndexes.exerciseToMachines.get(row.id) || new Set();

        if (!hasOwnSelection(row.id, selectedExerciseIds)) return false;
        if (!hasIntersection(linkedSubgroups, selectedMuscleIds)) return false;
        if (!hasIntersection(linkedMachines, selectedMachineIds)) return false;
        if (!rowMatchesQuery([row.name, row.name_key, row.type, row.primary_muscle_group, row.equipment], query)) return false;
        return true;
      })
      .map((row) => ({
        ...row,
        linkedSubgroupIds: setToArray(graphIndexes.exerciseToSubgroups.get(row.id)),
        linkedMachineIds: setToArray(graphIndexes.exerciseToMachines.get(row.id)),
      }))
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [exercises, graphIndexes.exerciseToMachines, graphIndexes.exerciseToSubgroups, query, selectedExerciseIds, selectedMachineIds, selectedMuscleIds]);

  const filteredMachines = useMemo(() => {
    return (machines || [])
      .filter((row) => {
        const linkedExercises = graphIndexes.machineToExercises.get(row.id) || new Set();
        const linkedSubgroups = graphIndexes.machineToSubgroupsDerived.get(row.id) || new Set();

        if (!hasOwnSelection(row.id, selectedMachineIds)) return false;
        if (!hasIntersection(linkedExercises, selectedExerciseIds)) return false;
        if (!hasIntersection(linkedSubgroups, selectedMuscleIds)) return false;
        if (!rowMatchesQuery([row.name, row.name_key, row.zone, ...(Array.isArray(row.primary_muscles) ? row.primary_muscles : [])], query)) return false;
        return true;
      })
      .map((row) => ({
        ...row,
        linkedExerciseIds: setToArray(graphIndexes.machineToExercises.get(row.id)),
      }))
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [graphIndexes.machineToExercises, graphIndexes.machineToSubgroupsDerived, machines, query, selectedExerciseIds, selectedMachineIds, selectedMuscleIds]);

  const muscleOptions = useMemo(
    () => subgroupRows.map((row) => ({ id: row.id, label: `${row.subgroupLabel} · ${row.groupLabel}` })),
    [subgroupRows],
  );

  const exerciseOptions = useMemo(
    () => (exercises || []).map((row) => ({ id: row.id, label: row.name || 'Exercise' })),
    [exercises],
  );

  const machineOptions = useMemo(
    () => (machines || []).map((row) => ({ id: row.id, label: row.name || 'Machine' })),
    [machines],
  );

  const activeFilters = useMemo(() => {
    const labelsByMuscleId = Object.fromEntries(muscleOptions.map((row) => [row.id, row.label]));
    const labelsByExerciseId = Object.fromEntries(exerciseOptions.map((row) => [row.id, row.label]));
    const labelsByMachineId = Object.fromEntries(machineOptions.map((row) => [row.id, row.label]));
    const chips = [];

    selectedMuscleIds.forEach((id) => {
      chips.push({ type: LIBRARY_ENTITY_TYPES.MUSCLE, id, label: labelsByMuscleId[id] || 'Muscle' });
    });
    selectedExerciseIds.forEach((id) => {
      chips.push({ type: LIBRARY_ENTITY_TYPES.EXERCISE, id, label: labelsByExerciseId[id] || 'Exercise' });
    });
    selectedMachineIds.forEach((id) => {
      chips.push({ type: LIBRARY_ENTITY_TYPES.MACHINE, id, label: labelsByMachineId[id] || 'Machine' });
    });
    return chips;
  }, [exerciseOptions, machineOptions, muscleOptions, selectedExerciseIds, selectedMachineIds, selectedMuscleIds]);

  const toggleMuscleFilter = useCallback((id) => {
    setSelectedMuscleIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);
  const toggleExerciseFilter = useCallback((id) => {
    setSelectedExerciseIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);
  const toggleMachineFilter = useCallback((id) => {
    setSelectedMachineIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const clearAllFilters = useCallback(() => {
    setQueryInput('');
    setQuery('');
    setSelectedMuscleIds([]);
    setSelectedExerciseIds([]);
    setSelectedMachineIds([]);
  }, []);

  const removeFilterChip = useCallback((chip) => {
    if (chip?.type === LIBRARY_ENTITY_TYPES.MUSCLE) {
      setSelectedMuscleIds((prev) => prev.filter((id) => id !== chip.id));
      return;
    }
    if (chip?.type === LIBRARY_ENTITY_TYPES.EXERCISE) {
      setSelectedExerciseIds((prev) => prev.filter((id) => id !== chip.id));
      return;
    }
    if (chip?.type === LIBRARY_ENTITY_TYPES.MACHINE) {
      setSelectedMachineIds((prev) => prev.filter((id) => id !== chip.id));
    }
  }, []);

  return {
    loading,
    error,
    warning,
    queryInput,
    query,
    setQuery: setQueryInput,
    selectedMuscleIds,
    selectedExerciseIds,
    selectedMachineIds,
    filteredMuscles,
    filteredExercises,
    filteredMachines,
    muscleOptions,
    exerciseOptions,
    machineOptions,
    activeFilters,
    filterCount: activeFilters.length,
    toggleMuscleFilter,
    toggleExerciseFilter,
    toggleMachineFilter,
    clearAllFilters,
    removeFilterChip,
    refresh: hydrate,
  };
}
