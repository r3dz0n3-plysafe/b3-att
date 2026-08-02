import { useEffect, useState } from 'react';
import { fetchMyFacePhoto } from './api.js';

export function useMyFacePhoto(authToken) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(authToken));
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!authToken) {
      setPhotoUrl('');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrlToRevoke = '';
    setIsLoading(true);

    (async () => {
      try {
        const url = await fetchMyFacePhoto(authToken);
        if (cancelled) return;
        if (url) {
          if (url.startsWith('blob:')) objectUrlToRevoke = url;
          setPhotoUrl(url);
        } else {
          setPhotoUrl('');
        }
      } catch {
        if (!cancelled) setPhotoUrl('');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [authToken, reloadTick]);

  const refetch = () => setReloadTick((t) => t + 1);

  return { photoUrl, isLoading, refetch };
}
