'use client';

import React, { useEffect, useState } from 'react';

const COOKIE_KEY = 'cp_cookie_accepted_v1';
const DEVICE_KEY = 'cp_device_id';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let v = window.localStorage.getItem(DEVICE_KEY);
  if (!v) {
    v = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));
    try { window.localStorage.setItem(DEVICE_KEY, v); } catch {/*ignore*/}
  }
  return v;
}

export default function CookieAgeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.localStorage.getItem(COOKIE_KEY)) {
      setShow(true);
    }
  }, []);

  async function accept() {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(COOKIE_KEY, new Date().toISOString()); } catch {/*ignore*/}
    setShow(false);
    // Log acceptance server-side (best-effort, don't block UI)
    try {
      await fetch('/api/responsible/cookie-accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceCookie: getOrCreateDeviceId(),
          ageConfirmed: true, cookiesAccepted: true,
        }),
      });
    } catch {/*ignore*/}
  }

  function leave() {
    window.location.href = 'https://www.begambleaware.org/';
  }

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 200,
      background: 'var(--cp-ink)', color: 'var(--cp-text-on-ink)',
      borderTop: '1px solid var(--cp-ink-line)',
      padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: '0 -8px 24px rgba(0,0,0,0.25)',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', width: '100%',
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'space-between',
      }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Age 18+ · Real-money gambling · Cookies
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--cp-text-on-ink-2)', lineHeight: 1.55 }}>
            By tapping <strong>Enter site</strong>, you confirm you&rsquo;re 18 or older
            (or your local legal gambling age, whichever is higher), you&rsquo;ve read
            our{' '}
            <a href="/terms" style={{ color: 'var(--cp-sun)', textDecoration: 'underline' }}>terms</a>,{' '}
            <a href="/privacy" style={{ color: 'var(--cp-sun)', textDecoration: 'underline' }}>privacy policy</a>,
            and{' '}
            <a href="/responsible-gambling" style={{ color: 'var(--cp-sun)', textDecoration: 'underline' }}>responsible-gambling page</a>,
            and you accept essential cookies needed to keep you logged in and process bets.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={leave} style={{
            height: 38, padding: '0 14px', borderRadius: 8,
            border: '1px solid var(--cp-ink-line)', background: 'transparent',
            color: 'var(--cp-text-on-ink-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>Leave</button>
          <button onClick={accept} style={{
            height: 38, padding: '0 18px', borderRadius: 8, border: 0,
            background: 'var(--cp-sun)', color: 'var(--cp-ink)',
            fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
          }}>Enter site</button>
        </div>
      </div>
    </div>
  );
}
