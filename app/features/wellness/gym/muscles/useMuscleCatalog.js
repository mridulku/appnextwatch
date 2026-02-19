import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { listCatalogItems } from '../../../../core/api/catalogSelectionDb';

export default function useMuscleCatalog() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exercises, setExercises] = useState([]);
  const [machines, setMachines] = useState([]);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [exerciseRows, machineRows] = await Promise.all([
        listCatalogItems({
          table: 'catalog_exercises',
          select: 'id,name,name_key,type,primary_muscle_group,equipment',
          orderBy: 'name',
        }),
        listCatalogItems({
          table: 'catalog_machines',
          select: 'id,name,name_key,zone,primary_muscles',
          orderBy: 'name',
        }),
      ]);

      setExercises(exerciseRows || []);
      setMachines(machineRows || []);
    } catch (nextError) {
      setError(nextError?.message || 'Unable to load muscle explorer right now.');
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

  return {
    loading,
    error,
    exercises,
    machines,
    refresh: hydrate,
  };
}
