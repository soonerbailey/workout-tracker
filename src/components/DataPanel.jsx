import React, { useState } from "react";
import { colors } from "../constants.js";
import { buildExerciseIndex, getToday, isValidDateStr, normalizeWorkout, sortWorkouts, uid } from "../utils.js";
import { isStandalone } from "../firebase.js";
import { S, btn, Modal, useUI } from "./ui.jsx";

export const parseBackup = (text, exercises) => {
  const payload = JSON.parse(text);
  const raw = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.workouts) ? payload.workouts : null);
  if (!raw) throw new Error("That doesn't look like a workout backup (expected a workouts list).");
  const idx = buildExerciseIndex(exercises);
  const out = { workouts: sortWorkouts(raw.map(w => normalizeWorkout(w, idx)).filter(w => isValidDateStr(w.date))) };
  if (payload && Array.isArray(payload.exercises)) {
    out.exercises = payload.exercises.filter(x => x && x.name).map(x => ({ name: String(x.name), muscleGroup: x.muscleGroup || "Other", type: x.type || "compound", ...(Array.isArray(x.secondary) ? { secondary: x.secondary } : {}) }));
  }
  if (payload && Array.isArray(payload.templates)) {
    out.templates = payload.templates.filter(t => t && t.name && Array.isArray(t.exercises)).map(t => ({ id: t.id || uid(), name: String(t.name), exercises: t.exercises }));
  }
  return out;
};

export function DataPanel({ data }) {
  const { workouts, exercises, templates, actions } = data;
  const { confirm, notify } = useUI();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const exportData = async () => {
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), workouts, exercises, templates }, null, 2);
    const filename = `workouts-${getToday()}.json`;
    // Downloads don't work in an installed iPhone app; use the share sheet there.
    if (isStandalone() && navigator.canShare) {
      const file = new File([json], filename, { type: "application/json" });
      if (navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "Workout backup" }); return; } catch (e) { if (e?.name === "AbortError") return; } }
    }
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const readText = (t) => {
    setText(t); setError(""); setPreview(null);
    if (!t.trim()) return;
    try {
      const p = parseBackup(t, exercises);
      const have = new Set(workouts.map(w => w.id));
      setPreview({ ...p, newCount: p.workouts.filter(w => !have.has(w.id)).length });
    } catch (e) { setError(e?.message?.startsWith("That") ? e.message : "Couldn't read that — paste the full contents of an exported .json file."); }
  };
  const onFile = (e) => { const f = e.target.files?.[0]; if (f) f.text().then(readText); };
  const close = () => { setOpen(false); setText(""); setPreview(null); setError(""); };

  const merge = async () => {
    const added = await actions.mergeAll(preview);
    notify(`Added ${added.workouts} workout${added.workouts !== 1 ? "s" : ""}${added.exercises ? `, ${added.exercises} exercises` : ""}${added.templates ? `, ${added.templates} templates` : ""}`);
    close();
  };
  const replace = async () => {
    if (!(await confirm({
      title: "Replace all your data?",
      message: `Your current ${workouts.length} workouts will be replaced by the ${preview.workouts.length} in this backup${data.user ? ", on every device signed in to your account" : ""}. You can undo right after.`,
      confirmLabel: "Replace everything", danger: true,
    }))) return;
    const prev = { workouts, exercises, templates };
    await actions.replaceAll({ workouts: preview.workouts, exercises: preview.exercises || exercises, templates: preview.templates || templates });
    close();
    notify("Data replaced", { actionLabel: "Undo", onAction: () => actions.replaceAll(prev), duration: 30000 });
  };

  return (
    <div style={{ padding: "8px 16px", display: "flex", gap: 8, justifyContent: "center", borderTop: `1px solid ${colors.border}`, background: colors.card }}>
      <button onClick={exportData} style={btn("secondary", { fontSize: 12 })}>Export Backup</button>
      <button onClick={() => setOpen(true)} style={btn("secondary", { fontSize: 12 })}>Restore Backup</button>
      {open && (
        <Modal onClose={close}>
          <h3 style={{ ...S.h3, fontSize: 17 }}>Restore from backup</h3>
          <input type="file" accept="application/json,.json" onChange={onFile} style={{ color: colors.textDim, fontSize: 13, marginBottom: 8 }} />
          <textarea value={text} onChange={e => readText(e.target.value)} placeholder="…or paste the backup JSON here"
            style={{ ...S.input, width: "100%", height: 110, fontSize: 13, resize: "vertical" }} />
          {error && <div style={{ color: colors.danger, fontSize: 13, marginTop: 8 }}>{error}</div>}
          {preview && (
            <div style={{ fontSize: 13, color: colors.textDim, margin: "10px 0", lineHeight: 1.6 }}>
              Backup has <b style={{ color: colors.text }}>{preview.workouts.length}</b> workouts ({preview.newCount} you don't have)
              {preview.exercises ? `, ${preview.exercises.length} exercises` : ""}{preview.templates ? `, ${preview.templates.length} templates` : ""}.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            <button disabled={!preview} onClick={merge} style={btn("primary", { padding: 12, opacity: preview ? 1 : 0.5 })}>Add what's missing (keeps your data)</button>
            <button disabled={!preview} onClick={replace} style={btn("danger", { padding: 12, opacity: preview ? 1 : 0.5 })}>Replace everything</button>
            <button onClick={close} style={btn("secondary", { padding: 12 })}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
