import { useCallback, useEffect, useState } from 'react';
import { agAPI } from '../api/ag.js';

// Interroge régulièrement l'état du Mode AG ; en cas d'échec réseau, garde le dernier état connu.
export default function useAgStatus(enabled, intervalMs = 5000) {
  const [status, setStatus] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const next = await agAPI.status();
      if (next) setStatus(next);
    } catch {
      /* état précédent conservé */
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      return undefined;
    }
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, refresh]);

  return { status, refresh };
}
