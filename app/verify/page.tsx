'use client';

import React, { useState, useEffect } from 'react';

// Provably-fair verifier. Re-implements the math from lib/games.ts and
// lib/crash.ts purely in the browser so anyone can paste a (server_seed,
// client_seed, nonce, game) and verify the result.

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function uniformRolls(serverSeed: string, clientSeed: string, nonce: number, count: number): Promise<number[]> {
  const rolls: number[] = [];
  let cursor = 0;
  while (rolls.length < count) {
    const h = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}:${cursor}`);
    for (let i = 0; i < 64 && rolls.length < count; i += 8) {
      rolls.push(parseInt(h.slice(i, i + 8), 16) / 0x1_0000_0000);
    }
    cursor++;
  }
  return rolls;
}

async function crashMultiplier(serverSeed: string, roundNumber: string): Promise<number> {
  const h = await hmacSha256Hex(serverSeed, roundNumber);
  const intVal = parseInt(h.slice(0, 13), 16);
  const u = intVal / Math.pow(2, 52);
  const raw = 0.95 / Math.max(0.0000001, 1 - u);
  return Math.max(1, Math.floor(raw * 100) / 100);
}

export default function VerifyPage() {
  const [game, setGame] = useState<'coinflip' | 'dice' | 'crash' | 'mines'>('coinflip');
  const [serverSeed, setServerSeed] = useState('');
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState<number>(1);
  const [result, setResult] = useState<string>('');
  const [hashOk, setHashOk] = useState<boolean | null>(null);

  // Pre-fill from URL params (every game's settle response includes a "Verify →" link)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    if (p.get('seed')) setServerSeed(p.get('seed') || '');
    if (p.get('hash')) setServerSeedHash(p.get('hash') || '');
    if (p.get('cs')) setClientSeed(p.get('cs') || '');
    if (p.get('nonce')) setNonce(parseInt(p.get('nonce') || '1', 10));
    if (p.get('game')) setGame(p.get('game') as any);
  }, []);

  async function verify() {
    setResult('Computing…');
    try {
      const computed = await sha256Hex(serverSeed);
      const ok = !serverSeedHash || computed === serverSeedHash;
      setHashOk(ok);
      let out = `sha256(server_seed) = ${computed}\n`;
      out += serverSeedHash
        ? (ok ? '✓ matches the published hash.\n\n' : '✗ does NOT match the published hash!\n\n')
        : '(no hash supplied to compare against)\n\n';

      if (game === 'coinflip') {
        const [u] = await uniformRolls(serverSeed, clientSeed, nonce, 1);
        let side: string; let miss = false;
        if (u < 0.475) side = 'HEADS';
        else if (u < 0.95) side = 'TAILS';
        else { side = u < 0.975 ? 'HEADS' : 'TAILS'; miss = true; }
        out += `u = ${u.toFixed(8)}\nside = ${side}${miss ? ' (5% house edge bucket)' : ''}\n`;
        out += `multiplier = ${miss ? '0 (house edge)' : '1.95'}`;
      } else if (game === 'dice') {
        const [u] = await uniformRolls(serverSeed, clientSeed, nonce, 1);
        const roll = Math.floor(u * 10000) / 100;
        out += `u = ${u.toFixed(8)}\nroll = ${roll.toFixed(2)}\n`;
        out += '(check direction + target against your bet to confirm win/loss)';
      } else if (game === 'crash') {
        const m = await crashMultiplier(serverSeed, String(nonce));
        out += `round_number used as salt = ${nonce}\ncrash_multiplier = ${m.toFixed(2)}×`;
      } else if (game === 'mines') {
        out += '(provide total / mines parameters to see grid; partial verification only)';
      }
      setResult(out);
    } catch (e: any) {
      setResult('Error: ' + (e?.message || e));
    }
  }

  return (
    <main className="cp-page-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.015em' }}>
        Provably fair verifier
      </h1>
      <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 13.5, lineHeight: 1.55 }}>
        Paste a settled bet&rsquo;s seed, hash, client seed, and nonce. We&rsquo;ll re-run the math
        right here in your browser — no server call, no trust required.
      </p>

      <div style={{
        background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
        padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Game</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {(['coinflip', 'dice', 'crash', 'mines'] as const).map(g => (
              <button key={g} onClick={() => setGame(g)} style={{
                height: 30, padding: '0 14px', borderRadius: 999,
                border: '1px solid', borderColor: game === g ? 'transparent' : 'var(--cp-line-strong)',
                background: game === g ? 'var(--cp-ink)' : 'var(--cp-card)',
                color: game === g ? 'var(--cp-text-on-ink)' : 'var(--cp-text-2)',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}>{g}</button>
            ))}
          </div>
        </div>

        <Field label="Server seed (revealed after the bet)" value={serverSeed} onChange={setServerSeed}/>
        <Field label="Server seed hash (published before)" value={serverSeedHash} onChange={setServerSeedHash}/>
        <Field label={game === 'crash' ? 'Round number (used as salt)' : 'Client seed'}
          value={game === 'crash' ? String(nonce) : clientSeed}
          onChange={v => game === 'crash' ? setNonce(parseInt(v, 10) || 1) : setClientSeed(v)}/>
        {game !== 'crash' && (
          <Field label="Nonce" value={String(nonce)} onChange={v => setNonce(parseInt(v, 10) || 1)} mono/>
        )}

        <button onClick={verify} style={{
          height: 44, borderRadius: 10, border: 0, background: 'var(--cp-ink)',
          color: 'var(--cp-text-on-ink)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>Verify</button>

        {result && (
          <pre style={{
            margin: 0, padding: 14, borderRadius: 10,
            background: hashOk === false ? 'var(--cp-no-soft)' : 'var(--cp-card-sub)',
            color: hashOk === false ? 'var(--cp-no-ink)' : 'var(--cp-text-2)',
            fontFamily: 'var(--cp-mono)', fontSize: 12, lineHeight: 1.55,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            border: '1px solid var(--cp-line)',
          }}>{result}</pre>
        )}
      </div>
    </main>
  );
}

function Field({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        className={mono ? 'cp-num' : ''}
        style={{
          marginTop: 4, width: '100%', height: 38, padding: '0 12px', borderRadius: 8,
          border: '1px solid var(--cp-line)', background: 'var(--cp-card-sub)',
          fontSize: 13, fontFamily: mono ? 'var(--cp-mono)' : 'inherit', color: 'var(--cp-text)',
          outline: 'none',
        }}
      />
    </div>
  );
}
