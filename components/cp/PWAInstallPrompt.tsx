'use client';

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'cp_pwa_install_dismissed';
const DISMISS_DAYS = 7;

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Suppress if recently dismissed
    try {
      const v = window.localStorage.getItem(DISMISS_KEY);
      if (v && Date.now() - parseInt(v, 10) < DISMISS_DAYS * 86400000) return;
    } catch {/*ignore*/}

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!show || !deferred) return null;

  async function install() {
    try {
      await deferred?.prompt();
      await deferred?.userChoice;
    } catch {/*ignore*/}
    setShow(false);
  }
  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {/*ignore*/}
    setShow(false);
  }

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 80, zIndex: 150,
      maxWidth: 440, margin: '0 auto',
      background: 'var(--cp-card)', borderRadius: 14, padding: 16,
      border: '1px solid var(--cp-line-strong)', boxShadow: 'var(--cp-shadow-pop)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flex: '0 0 auto',
        background: 'var(--cp-sun)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--cp-serif)', fontSize: 26, color: 'var(--cp-ink)',
      }}>₮</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--cp-text)' }}>
          Install CaribPredict
        </div>
        <div style={{ fontSize: 12, color: 'var(--cp-text-3)', marginTop: 2, lineHeight: 1.45 }}>
          Add to home screen. Faster loads. Push alerts when markets close.
        </div>
      </div>
      <button onClick={dismiss} style={{
        background: 'transparent', border: 0, color: 'var(--cp-text-3)',
        cursor: 'pointer', fontSize: 12, padding: 4,
      }}>Later</button>
      <button onClick={install} style={{
        height: 34, padding: '0 14px', borderRadius: 8, border: 0,
        background: 'var(--cp-ink)', color: 'var(--cp-text-on-ink)',
        fontSize: 13, fontWeight: 700, cursor: 'pointer',
      }}>Install</button>
    </div>
  );
}
