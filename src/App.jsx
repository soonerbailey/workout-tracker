import React, { useEffect, useState } from "react";
import { colors } from "./constants.js";
import { useAppData } from "./store.js";
import { signIn, signOut, usingEmulator } from "./firebase.js";
import { loadDraft, saveDraft, isDraftDirty } from "./draft.js";
import { UIProvider, Modal, S, btn, useUI } from "./components/ui.jsx";
import { LogWorkout } from "./components/LogWorkout.jsx";
import { History } from "./components/History.jsx";
import { Analytics } from "./components/Analytics.jsx";
import { TodaySuggestion } from "./components/Today.jsx";
import { ExerciseManager } from "./components/ExerciseManager.jsx";
import { HelpGuide } from "./components/Help.jsx";
import { DataPanel } from "./components/DataPanel.jsx";
import { RestAlarm, useRemaining } from "./components/RestTimer.jsx";

const SYNC_LABEL = {
  loading: ["Loading…", colors.textMuted], synced: ["Synced", colors.success], pending: ["Saving…", colors.textMuted],
  offline: ["Offline — will sync when you're back online", colors.warning], error: ["Sync error", colors.danger],
};

function AuthBar({ user, sync, syncError, onSignIn, onSignOut }) {
  const [label, color] = SYNC_LABEL[sync] || ["", colors.textMuted];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 12px", background: colors.card, borderBottom: `1px solid ${colors.border}` }}>
      <span style={{ fontSize: 11, color: user ? color : colors.textMuted }} title={syncError || ""}>
        {user ? (sync === "error" && syncError ? `Sync error: ${syncError}` : label) : "Not signed in — saved on this device only"}
        {usingEmulator && " · EMULATOR"}
      </span>
      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 26, height: 26, borderRadius: "50%" }} />}
          <button onClick={onSignOut} style={btn("secondary", { padding: "5px 10px", fontSize: 12 })}>Sign out</button>
        </div>
      ) : (
        <button onClick={onSignIn} style={{ padding: "7px 14px", background: "#fff", border: "none", borderRadius: 8, color: "#333", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign in with Google
        </button>
      )}
    </div>
  );
}

function NavBar({ view, setView, draftDirty, timer }) {
  const remaining = useRemaining(timer.endAt);
  const tabs = [
    { id: "suggest", label: "Today", icon: "★" },
    { id: "log", label: "Log", icon: "+" },
    { id: "history", label: "History", icon: "☰" },
    { id: "analytics", label: "Analytics", icon: "↗" },
    { id: "exercises", label: "Exercises", icon: "⚙" },
    { id: "help", label: "Help", icon: "?" },
  ];
  return (
    <nav style={{ display: "flex", gap: 2, padding: "6px 8px", background: colors.card, borderBottom: `1px solid ${colors.border}`, position: "sticky", top: 0, zIndex: 100 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setView(t.id)} aria-current={view === t.id ? "page" : undefined}
          style={{ flex: 1, padding: "8px 2px", border: "none", borderRadius: 8, position: "relative", background: view === t.id ? colors.accent : "transparent", color: view === t.id ? "#fff" : colors.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <span style={{ fontSize: 16, display: "block", marginBottom: 2 }}>{t.icon}</span>
          {t.id === "log" && remaining != null && view !== "log" ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : t.label}
          {t.id === "log" && draftDirty && view !== "log" && <span aria-label="workout in progress" style={{ position: "absolute", top: 6, right: "22%", width: 7, height: 7, borderRadius: "50%", background: colors.warning }} />}
        </button>
      ))}
    </nav>
  );
}

function InstallPrompt() {
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem("wt:install-dismissed") === "1"; } catch { return false; } });
  const [deferred, setDeferred] = useState(null);
  const standalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (dismissed || standalone) return null;
  const dismiss = () => { setDismissed(true); try { localStorage.setItem("wt:install-dismissed", "1"); } catch {} };
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return (
    <div style={{ margin: "12px 12px 0", padding: "12px 14px", background: colors.card, border: `1px solid ${colors.accent}44`, borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 22 }}>📲</div>
      <div style={{ flex: 1, color: colors.textDim, fontSize: 12, lineHeight: 1.4 }}>
        <div style={{ color: colors.text, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Install this app</div>
        {isIOS ? <>Tap <b style={{ color: colors.text }}>Share</b> in Safari, then <b style={{ color: colors.text }}>Add to Home Screen</b></>
          : deferred ? <button onClick={async () => { deferred.prompt(); await deferred.userChoice; setDeferred(null); dismiss(); }} style={btn("primary", { marginTop: 4, padding: "6px 14px", fontSize: 12 })}>Add to Home Screen</button>
          : <>Use your browser menu → <b style={{ color: colors.text }}>Add to Home Screen</b></>}
      </div>
      <button onClick={dismiss} aria-label="Dismiss" style={btn("ghost", { fontSize: 18 })}>✕</button>
    </div>
  );
}

function PendingLocalDialog({ pending, onResolve }) {
  const n = pending.workouts.length, ex = pending.exercises.length, tp = pending.templates.length;
  const parts = [n && `${n} workout${n > 1 ? "s" : ""}`, ex && `${ex} custom exercise${ex > 1 ? "s" : ""}`, tp && `${tp} template${tp > 1 ? "s" : ""}`].filter(Boolean).join(", ");
  return (
    <Modal maxWidth={400}>
      <h3 style={{ ...S.h3, fontSize: 17 }}>Add this device's data to your account?</h3>
      <p style={{ color: colors.textDim, fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>This device has {parts} that aren't in your account — probably logged while signed out.</p>
      {n > 0 && <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14, maxHeight: 120, overflowY: "auto" }}>{pending.workouts.slice(-8).map(w => <div key={w.id}>• {w.date} — {w.name}</div>)}{n > 8 && <div>…and {n - 8} more</div>}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onResolve(true)} style={btn("primary", { flex: 1, padding: 12 })}>Add to account</button>
        <button onClick={() => onResolve(false)} style={btn("secondary", { flex: 1, padding: 12 })}>Discard</button>
      </div>
    </Modal>
  );
}

function AppInner() {
  const data = useAppData();
  const { notify } = useUI();
  const [view, setView] = useState(() => (isDraftDirty(loadDraft()) ? "log" : "suggest"));
  const [draft, setDraft] = useState(loadDraft);
  const [timer, setTimer] = useState(() => { try { return { duration: 90, endAt: null, ...JSON.parse(localStorage.getItem("wt:timer") || "{}") }; } catch { return { duration: 90, endAt: null }; } });

  useEffect(() => saveDraft(draft), [draft]);
  useEffect(() => { try { localStorage.setItem("wt:timer", JSON.stringify(timer)); } catch {} }, [timer]);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  useEffect(() => { if (data.authError) { notify(`Sign-in failed: ${data.authError}`); data.setAuthError(""); } }, [data.authError]);

  const handleSignIn = () => signIn().catch(err => notify(`Sign-in failed: ${err?.message || err}`));
  const handleSignOut = () => signOut();

  if (data.authLoading) {
    return <div style={{ minHeight: "100vh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textDim }}>Loading…</div>;
  }

  const props = { data, draft, setDraft, setView };
  return (
    <div style={{ minHeight: "100vh", background: colors.bg, maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <AuthBar user={data.user} sync={data.sync} syncError={data.syncError} onSignIn={handleSignIn} onSignOut={handleSignOut} />
      <InstallPrompt />
      <NavBar view={view} setView={setView} draftDirty={isDraftDirty(draft)} timer={timer} />
      <RestAlarm timer={timer} setTimer={setTimer} />
      <main style={{ flex: 1, paddingBottom: 24 }}>
        {data.user && !data.loaded && <div style={{ padding: "8px 16px", fontSize: 12, color: colors.textMuted }}>Loading your workouts…</div>}
        {view === "log" && <LogWorkout {...props} timer={timer} setTimer={setTimer} />}
        {view === "history" && <History {...props} />}
        {view === "analytics" && <Analytics data={data} />}
        {view === "suggest" && <TodaySuggestion {...props} />}
        {view === "exercises" && <ExerciseManager data={data} />}
        {view === "help" && <HelpGuide />}
      </main>
      <DataPanel data={data} />
      {data.pendingLocal && <PendingLocalDialog pending={data.pendingLocal} onResolve={data.resolvePendingLocal} />}
    </div>
  );
}

export default function App() {
  return <UIProvider><AppInner /></UIProvider>;
}
