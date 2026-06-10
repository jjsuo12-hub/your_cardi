import { useEffect, useState } from 'react';

import { emrRepository } from '../api/emr/emrRepository';
import { WardPatient } from '../types/emrTypes';

export function useEmrPatients() {
  const [patients, setPatients] = useState<WardPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    emrRepository
      .getWardPatients()
      .then((nextPatients) => {
        if (!active) return;
        setPatients(nextPatients);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unknown EMR repository error');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { loading, error, patients };
}
