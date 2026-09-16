import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { locationTime, readingAge } from '../utils/locationPresentation';

export function useLocationAge(updatedAt?: string) {
  const [now, setNow] = useState(Date.now);
  const timestamp = updatedAt === undefined ? null : locationTime(updatedAt);

  useEffect(() => {
    if (updatedAt !== undefined && timestamp === null) {
      console.warn('Location reading has an invalid timestamp', updatedAt);
    }
  }, [updatedAt, timestamp]);

  useEffect(() => {
    if (timestamp === null) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      setNow(Date.now());
      timer = setInterval(() => setNow(Date.now()), 1000);
    };
    if (AppState.currentState === 'active') start();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [timestamp]);

  return {
    age: readingAge(timestamp, now),
    absoluteTime:
      timestamp === null ? null : new Date(timestamp).toLocaleString(),
  };
}
