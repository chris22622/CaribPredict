'use client';

import { useEffect } from 'react';

// Embeds Tawk.to live chat widget. The Tawk property + widget ids are
// pulled from env vars so you can swap accounts without a code change.
// Get free credentials at https://dashboard.tawk.to → Administration → Property → Chat widget.

export default function LiveChat() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
    const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;
    if (!propertyId || !widgetId) return;  // silently no-op if not configured

    // Don't inject twice
    if (document.getElementById('tawk-script')) return;
    const w = window as any;
    w.Tawk_API = w.Tawk_API || {};
    w.Tawk_LoadStart = new Date();
    const s = document.createElement('script');
    s.id = 'tawk-script';
    s.async = true;
    s.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    s.setAttribute('crossorigin', '*');
    document.head.appendChild(s);

    return () => {
      // We don't tear down between routes — chat widgets persist
    };
  }, []);

  return null;
}
