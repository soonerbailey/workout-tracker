// The in-progress workout ("draft") lives at the app level and in localStorage, so switching
// tabs, locking the phone, or reloading never loses what you've entered.
import { getToday, uid } from "./utils.js";

const DRAFT_KEY = "wt:draft:v1";

export const makeSet = (o = {}) => ({ id: uid(), weight: 0, reps: 0, note: "", loadText: "", ...o });
export const makeEntry = (o = {}) => ({ id: uid(), exercise: "", unit: "lbs", sets: [makeSet(), makeSet(), makeSet()], ...o });
export const emptyDraft = () => ({ editingId: null, name: "", date: getToday(), entries: [makeEntry()] });

export const isDraftDirty = (d) => !!(d && (d.editingId || d.name.trim() || d.entries.some(e => e.exercise || e.sets.some(s => s.reps > 0 || s.weight > 0 || s.loadText || s.note))));

export const loadDraft = () => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!d || !Array.isArray(d.entries)) return emptyDraft();
    // An untouched draft should always default to today.
    if (!isDraftDirty(d)) return emptyDraft();
    return d;
  } catch { return emptyDraft(); }
};
export const saveDraft = (d) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {} };

export const draftFromWorkout = (w) => ({
  editingId: w.id, name: w.name, date: w.date,
  entries: w.entries.map(e => ({ id: e.id || uid(), exercise: e.exercise, unit: e.unit || "lbs", sets: e.sets.map(s => makeSet({ ...s, id: s.id || uid() })) })),
});

export const draftFromTemplate = (tpl) => ({
  editingId: null, name: tpl.name, date: getToday(),
  entries: tpl.exercises.map(x => makeEntry({ exercise: x.exercise, unit: x.unit || "lbs", sets: Array.from({ length: x.defaultSets || 3 }, () => makeSet()) })),
});

// From a Today suggestion: pre-fill target numbers.
export const draftFromSuggestion = (name, suggestions) => ({
  editingId: null, name, date: getToday(),
  entries: suggestions.map(s => makeEntry({
    exercise: s.exercise, unit: s.unit || "lbs",
    sets: Array.from({ length: s.sets || 3 }, () => makeSet({ weight: s.weight || 0, reps: s.reps || 0, loadText: s.loadText || "" })),
  })),
});
