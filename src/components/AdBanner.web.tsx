import React, { useEffect, useRef } from 'react';

// TODO: Replace ca-pub-XXXXXXXXXXXXXXXX with real AdSense publisher ID
// TODO: Replace slot values with real AdSense slot IDs

interface AdBannerProps {
  slot?: string;
  format?: string;
  style?: React.CSSProperties;
}

export function AdBanner({
  slot = 'XXXXXXXXXX',
  format = 'auto',
  style,
}: AdBannerProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      // @ts-ignore — adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  return (
    <div style={{ textAlign: 'center', margin: '8px 0', ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '90px' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
