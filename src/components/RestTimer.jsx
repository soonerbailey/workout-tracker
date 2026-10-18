import React, { useEffect, useRef, useState } from "react";
import { colors, REST_PRESETS } from "../constants.js";
import { btn } from "./ui.jsx";

// The timer stores an absolute end time, so it stays correct across tab switches,
// screen locks and reloads.
let audioCtx = null;
export const primeAudio = () => {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {}
};
const beep = () => {
  try {
    if (!audioCtx) return;
    [0, 0.25, 0.5].forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.18);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch {}
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
};

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function useRemaining(endAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endAt]);
  return endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : null;
}

// Fires the alert once when the timer reaches zero (mounted at app level).
export function RestAlarm({ timer, setTimer }) {
  const remaining = useRemaining(timer.endAt);
  const fired = useRef(null);
  useEffect(() => {
    if (timer.endAt && remaining === 0 && fired.current !== timer.endAt) {
      fired.current = timer.endAt;
      beep();
      const end = timer.endAt;
      setTimeout(() => setTimer(t => (t.endAt === end ? { ...t, endAt: null } : t)), 4000);
    }
  }, [remaining, timer.endAt, setTimer]);
  return null;
}

export function RestTimer({ timer, setTimer }) {
  const remaining = useRemaining(timer.endAt);
  const running = timer.endAt && remaining > 0;
  const done = timer.endAt && remaining === 0;
  const start = (sec) => { primeAudio(); setTimer({ duration: sec, endAt: Date.now() + sec * 1000 }); };
  return (
    <div style={{ position: "sticky", bottom: 8, marginTop: 16, zIndex: 50, background: done ? colors.success + "22" : colors.card, border: `1px solid ${done ? colors.success : running ? colors.accent : colors.border}`, borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,.35)" }}>
      <span style={{ fontSize: 13, color: colors.textMuted, minWidth: 34 }}>Rest</span>
      {running || done ? (
        <>
          <span aria-live="polite" style={{ flex: 1, fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: done ? colors.success : colors.text }}>{done ? "Go!" : fmt(remaining)}</span>
          {running && <button onClick={() => setTimer(t => ({ ...t, endAt: t.endAt + 30000 }))} style={btn("secondary", { padding: "6px 10px" })}>+30s</button>}
          <button onClick={() => setTimer(t => ({ ...t, endAt: null }))} style={btn("secondary", { padding: "6px 10px" })}>{done ? "Done" : "Stop"}</button>
        </>
      ) : (
        <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
          {REST_PRESETS.map(s => (
            <button key={s} onClick={() => start(s)} style={btn(timer.duration === s ? "outline" : "secondary", { padding: "6px 10px", flex: 1 })}>{fmt(s)}</button>
          ))}
        </div>
      )}
    </div>
  );
}
