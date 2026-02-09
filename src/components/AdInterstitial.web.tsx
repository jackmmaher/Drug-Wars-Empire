import React, { useState, useEffect, useRef } from 'react';

// TODO: Replace ca-pub-XXXXXXXXXXXXXXXX and slot with real AdSense IDs

interface AdInterstitialProps {
  onClose: () => void;
  duration?: number;
}

export function AdInterstitial({ onClose, duration = 5 }: AdInterstitialProps) {
  const [countdown, setCountdown] = useState(duration);
  const [canClose, setCanClose] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setCanClose(true);
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      // @ts-ignore — adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: '#131b2e',
          borderRadius: 12,
          padding: 24,
          maxWidth: 600,
          width: '90%',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
          Advertisement
        </p>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', minHeight: '250px', marginBottom: '16px' }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot="XXXXXXXXXX"
          data-ad-format="rectangle"
        />
        {canClose ? (
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Continue to game
          </button>
        ) : (
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Continue in {countdown}s...
          </p>
        )}
      </div>
    </div>
  );
}
