'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SunDot } from './Icon';

const KEY = 'cp_onboarded_v1';

interface Slide {
  emoji: string;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '🌴',
    title: 'Welcome to CaribPredict',
    body: 'Bet on real Caribbean events and provably-fair instant games. Everything settles in USDT.',
    accent: '#E8A53C',
  },
  {
    emoji: '🎰',
    title: 'Six ways to bet',
    body: 'Prediction markets, CaribCrash, Plinko, Mines, Dice, Coin Flip. Pick any one and pay 1 USDT to start.',
    accent: '#0E7C66',
  },
  {
    emoji: '🎁',
    title: '3 USDT free play',
    body: 'New accounts get a welcome bonus the moment they sign in. Daily login adds more. VIP rakeback every Monday.',
    accent: '#D24A3A',
  },
];

export default function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [index, setIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!window.localStorage.getItem(KEY)) {
        // Delay so it doesn't fight the cookie banner on the very first paint.
        setTimeout(() => setShow(true), 1200);
      }
    } catch {/* ignore */}
  }, []);

  function dismiss() {
    try { window.localStorage.setItem(KEY, new Date().toISOString()); } catch {/*ignore*/}
    setShow(false);
  }
  function next() {
    if (index < SLIDES.length - 1) setIndex(i => i + 1);
    else dismiss();
  }
  function start() {
    dismiss();
    router.push('/games');
  }

  if (!show) return null;
  const s = SLIDES[index];

  return (
    <div onClick={dismiss} style={{
      position: 'fixed', inset: 0, zIndex: 220,
      background: 'rgba(11,31,46,0.65)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, maxWidth: 'calc(100% - 16px)',
        background: 'var(--cp-card)', borderRadius: 20,
        boxShadow: 'var(--cp-shadow-pop)', overflow: 'hidden',
        border: '1px solid var(--cp-line)',
      }}>
        <div style={{
          background: `linear-gradient(155deg, var(--cp-ink) 0%, var(--cp-ink-2) 100%)`,
          padding: '28px 28px 36px', color: 'var(--cp-text-on-ink)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: -80, top: -80, width: 280, height: 280, borderRadius: '50%',
            background: `radial-gradient(circle, ${s.accent}55 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}/>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <SunDot size={20} color="var(--cp-sun)"/>
            <span style={{ fontFamily: 'var(--cp-serif)', fontSize: 16 }}>CaribPredict</span>
            <button onClick={dismiss} style={{
              marginLeft: 'auto', background: 'transparent', border: 0, padding: 4,
              color: 'var(--cp-text-on-ink-3)', fontSize: 12.5, cursor: 'pointer',
            }}>Skip</button>
          </div>

          <div style={{ position: 'relative', fontSize: 64, lineHeight: 1, marginBottom: 18 }}>{s.emoji}</div>
          <h2 style={{
            position: 'relative', margin: 0,
            fontFamily: 'var(--cp-serif)', fontWeight: 400,
            fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1.15,
            color: 'var(--cp-text-on-ink)',
          }}>{s.title}</h2>
          <p style={{
            position: 'relative', margin: '10px 0 0',
            color: 'var(--cp-text-on-ink-2)', fontSize: 14.5, lineHeight: 1.55,
          }}>{s.body}</p>

          <div style={{
            position: 'relative', display: 'inline-flex', gap: 6, marginTop: 20,
          }}>
            {SLIDES.map((_, i) => (
              <span key={i} style={{
                width: i === index ? 24 : 8, height: 8, borderRadius: 999,
                background: i === index ? 'var(--cp-sun)' : 'rgba(255,255,255,0.15)',
                transition: 'width .25s, background .25s',
              }}/>
            ))}
          </div>
        </div>

        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <button onClick={dismiss} style={{
            background: 'transparent', border: 0, color: 'var(--cp-text-3)',
            fontSize: 13, cursor: 'pointer', padding: 6,
          }}>Maybe later</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {index < SLIDES.length - 1 ? (
              <button onClick={next} style={{
                height: 38, padding: '0 18px', borderRadius: 8, border: 0,
                background: 'var(--cp-ink)', color: 'var(--cp-text-on-ink)',
                fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
              }}>Next</button>
            ) : (
              <>
                <button onClick={dismiss} style={{
                  height: 38, padding: '0 16px', borderRadius: 8,
                  border: '1px solid var(--cp-line-strong)', background: 'var(--cp-card)',
                  color: 'var(--cp-text-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>Browse markets</button>
                <button onClick={start} style={{
                  height: 38, padding: '0 18px', borderRadius: 8, border: 0,
                  background: 'var(--cp-sun)', color: 'var(--cp-ink)',
                  fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                }}>See the games</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
