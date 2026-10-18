import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { colors } from "../constants.js";

// ─── Shared styles ───────────────────────────────────────────────────
export const S = {
  page: { padding: 16 },
  h2: { color: colors.text, margin: "0 0 16px", fontSize: 22 },
  h3: { color: colors.text, margin: "0 0 12px", fontSize: 16 },
  card: { background: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, border: `1px solid ${colors.border}` },
  input: { padding: "8px 10px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, fontSize: 16, minWidth: 0, boxSizing: "border-box" },
  label: { fontSize: 12, color: colors.textMuted, display: "block", marginBottom: 4 },
  caps: { fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  muted: { color: colors.textDim, fontSize: 13 },
};

export const btn = (variant = "secondary", extra = {}) => {
  const base = { padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none" };
  const v = {
    primary: { background: colors.accent, color: "#fff" },
    secondary: { background: colors.bg, color: colors.textDim, border: `1px solid ${colors.border}` },
    outline: { background: "transparent", color: colors.accentLight, border: `1px solid ${colors.accent}66` },
    danger: { background: "transparent", color: colors.danger, border: `1px solid ${colors.danger}88` },
    dangerSolid: { background: colors.danger, color: "#fff" },
    ghost: { background: "none", color: colors.textMuted, padding: 4 },
  }[variant];
  return { ...base, ...v, ...extra };
};

export const pill = (active, extra = {}) => ({
  padding: "5px 12px", borderRadius: 16, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
  background: active ? colors.accent : colors.card, color: active ? "#fff" : colors.textDim, ...extra,
});

export function Modal({ children, onClose, maxWidth = 400 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && onClose) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
      <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: "100%", maxWidth, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${colors.border}` }}>
        {children}
      </div>
    </div>
  );
}

// ─── Confirm dialogs + undo toasts (app-wide) ────────────────────────
const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);

export function UIProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const confirm = useCallback((opts) => new Promise(resolve => setDialog({ ...opts, resolve })), []);
  const close = (v) => { dialog?.resolve(v); setDialog(null); };

  const notify = useCallback((message, { actionLabel, onAction, duration = 6000 } = {}) => {
    clearTimeout(timer.current);
    setToast({ message, actionLabel, onAction, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);

  return (
    <UICtx.Provider value={{ confirm, notify }}>
      {children}
      {dialog && (
        <Modal onClose={() => close(false)} maxWidth={380}>
          <h3 style={{ color: colors.text, margin: "0 0 10px", fontSize: 17 }}>{dialog.title}</h3>
          {dialog.message && <div style={{ color: colors.textDim, fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>{dialog.message}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button autoFocus onClick={() => close(true)} style={btn(dialog.danger ? "dangerSolid" : "primary", { flex: 1, padding: 12, fontSize: 14 })}>{dialog.confirmLabel || "OK"}</button>
            {dialog.cancelLabel !== null && <button onClick={() => close(false)} style={btn("secondary", { flex: 1, padding: 12, fontSize: 14 })}>{dialog.cancelLabel || "Cancel"}</button>}
          </div>
        </Modal>
      )}
      {toast && (
        <div key={toast.key} role="status" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 76, zIndex: 400, background: "#2b2f42", color: colors.text, borderRadius: 10, padding: "10px 14px", display: "flex", gap: 14, alignItems: "center", fontSize: 14, boxShadow: "0 6px 24px rgba(0,0,0,.45)", maxWidth: "calc(100% - 32px)" }}>
          <span>{toast.message}</span>
          {toast.actionLabel && (
            <button onClick={() => { toast.onAction?.(); setToast(null); }} style={{ background: "none", border: "none", color: colors.accentLight, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0 }}>
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </UICtx.Provider>
  );
}
