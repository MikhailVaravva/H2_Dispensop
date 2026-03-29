import { useState, useCallback } from 'react';
import { requestPour, PourResponse } from '../services/api';

export function usePourPermission(stationId: string) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permission, setPermission] = useState<PourResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pour = useCallback(async () => {
    setIsRequesting(true);
    setError(null);
    try {
      const result = await requestPour(stationId);
      setPermission(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsRequesting(false);
    }
  }, [stationId]);

  const reset = useCallback(() => {
    setPermission(null);
    setError(null);
  }, []);

  return { pour, isRequesting, permission, error, reset };
}
