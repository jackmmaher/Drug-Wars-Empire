import React, { useEffect } from 'react';

// Native fallback: immediately dismiss since ads only display on web
export function AdInterstitial({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    onClose();
  }, []);
  return null;
}
