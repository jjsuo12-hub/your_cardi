import { useEffect, useState } from 'react';

import { emrRepository } from '../api/emr/emrRepository';
import { PatientVitalSnapshot } from '../types/emrTypes';

export function usePatientVitals(patientId?: string) {
  const [vital, setVital] = useState<PatientVitalSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(patientId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!patientId) {
      setVital(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    emrRepository
      .getPatientVitals(patientId)
      .then((nextVital) => {
        if (!active) return;
        setVital(nextVital);
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
  }, [patientId]);

  return { loading, error, vital };
}
