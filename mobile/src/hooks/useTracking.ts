import { useEffect } from 'react';
import { trackingService } from '../services/trackingService';
import { useTrackingStore } from '../state/trackingStore';

/** Starts the polling service on mount and exposes the tracking state. */
export function useTracking() {
  const state = useTrackingStore();

  useEffect(() => {
    trackingService.start();
    return () => trackingService.stop();
  }, []);

  return state;
}
