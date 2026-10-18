// Parses free-form workout notes (the way Drew writes them on his phone) into workouts.
//
//   Day 1
//   Zercher Squat 4x3 2 on last 205lb
//   OHP 4x5 125/135/135/140
//   Weighted dips AMRAP 10lb ball
//   Banded lateral walk 3x24 Blue or black band
//   Hollow Body Hold 3x15 sec
//
import { isValidDateStr } from "./utils.js";

const ABBREV = {
  db: "dumbbell", dbs: "dumbbell", bb: "barbell", kb: "kettlebell", kbs: "kettlebell",
  ohp: "overhead press", rdl: "romanian deadlift", rdls: "romanian deadlift",
  rfess: "rear foot elevated split squat", bss: "bulgarian split squat", tgu: "turkish get up",
  pullup: "pull up", pullups: "pull up", chinup: "chin up", chinups: "chin up",
  pushup: "push up", pushups: "push up", situp: "sit up", situps: "sit up",
  sl: "single leg", rdlz: "romanian deadlift", tri: "tricep", tris: "tricep", bi: "bicep",
};
// Tokens that don't change which exercise it is.
const NOISE = new Set(["the", "a", "and", "with", "of"]);

export const normName = (s) => {
  const words = String(s).toLowerCase()
    .replace(/[+&]/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/).filter(Boolean)
    .flatMap(w => (ABBREV[w] || w).split(" "))
    .map(w => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .filter(w => !NOISE.has(w));
  // "push up" vs "pushup": join common two-word forms
  return words.join(" ").replace(/\b(push|pull|chin|sit) ups?\b/g, "$1up");
};

// Short names that are ambiguous by word overlap alone.
const PHRASE_ALIASES = {
  "bench": "barbell bench press", "bench press": "barbell bench press", "bb bench": "barbell bench press",
  "incline bench": "incline bench press", "squat": "barbell back squat", "back squat": "barbell back squat",
  "deadlift": "conventional deadlift", "dip": "weighted dip", "row": "barbell row", "curl": "barbell curl",
  "trap bar": "raised trap bar deadlift", "trap bar deadlift": "raised trap bar deadlift",
  "bike": "air bike", "assault bike": "air bike", "row erg": "rower", "ski": "ski erg",
};

export const matchExercise = (raw, names) => {
  let n = normName(raw);
  if (!n) return null;
  const normed = names.map(name => ({ name, n: normName(name) }));
  let exact = normed.find(x => x.n === n);
  if (exact) return exact.name;
  const alias = PHRASE_ALIASES[n] && normName(PHRASE_ALIASES[n]);
  if (alias && (exact = normed.find(x => x.n === alias))) return exact.name;
  const toks = new Set(n.split(" "));
  let best = null, bestScore = 0;
  normed.forEach(x => {
    const xt = new Set(x.n.split(" "));
    const inter = [...toks].filter(t => xt.has(t)).length;
    const score = inter / new Set([...toks, ...xt]).size;
    // Require every typed word to appear, or a strong overlap.
    const allTyped = inter === toks.size;
    const s = allTyped ? score + 0.25 : score;
    if (s > bestScore) { bestScore = s; best = x.name; }
  });
  return bestScore >= 0.6 ? best : null;
};

const BW_HINT = /\b(dip|pull ?-?ups?|pullups?|chin ?-?ups?|push ?-?ups?|pushups?|air squat|plank|hollow|burpee|sit ?-?ups?|lunge)/i;
const COLORS = "(?:yellow|red|green|blue|black|purple|orange|gr[ae]y|white|pink|light|medium|heavy|mini|monster)";

const DATE_RE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/;

export const parseDateToken = (tok, today = new Date()) => {
  if (isValidDateStr(tok)) return tok;
  const m = tok.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;
  const mo = +m[1], d = +m[2];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  let y = m[3] ? +m[3] : today.getFullYear();
  if (y < 100) y += 2000;
  // A date with no year that would be in the future means last year.
  if (!m[3]) {
    const cand = new Date(y, mo - 1, d);
    if (cand - today > 2 * 86400000) y -= 1;
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const isDataStart = (tok) => /^\d/.test(tok) || /^(amrap|bw|bodyweight|x\d)/i.test(tok) || /^[x×]\d/i.test(tok);

// Parse one exercise line. `hints.unitFor(name)` can return the last-used unit for an exercise.
export const parseExerciseLine = (line, { names = [], unitFor = () => null } = {}) => {
  let text = line.replace(/^[-•*\d]+[.)]\s+/, "").trim(); // bullets / "1. "
  const tokens = text.split(/\s+/);
  let cut = tokens.findIndex((t, i) => i > 0 && isDataStart(t.replace(/^[:(\-–]+/, "")));
  // Band colors before the word "band" also start the data part.
  const bandIdx = tokens.findIndex((t, i) => i > 0 && new RegExp(`^${COLORS}$`, "i").test(t) && /band/i.test(tokens.slice(i).join(" ")) && !/^band(ed)?$/i.test(tokens[i - 1] || ""));
  if (bandIdx > 0 && (cut < 0 || bandIdx < cut)) cut = bandIdx;
  if (cut < 0) cut = tokens.length;
  const rawName = tokens.slice(0, cut).join(" ").replace(/[:\-–,]+$/, "").trim();
  let rest = " " + tokens.slice(cut).join(" ") + " ";
  const warnings = [];
  const take = (re) => { const m = rest.match(re); if (m) rest = rest.replace(m[0], " "); return m; };

  let unit = null, nSets = null, reps = null, amrap = false, weights = null, loadText = "", lastReps = null;

  // "2 on last" / "2 reps on last set"
  const onLast = take(/\b(\d+)\s*(?:reps?\s*)?on\s+(?:the\s+)?last(?:\s+set)?\b/i);
  if (onLast) lastReps = +onLast[1];

  // Per-set weights "125/135/135/140 lbs" (before sets x reps so "140 x5" isn't 140 sets)
  const multi = take(/(?:^|\s)(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+)\s*(lbs?|kg|#)?(?=\s|$)/i);
  if (multi) {
    weights = multi[1].split("/").map(x => +x.trim());
    if (multi[2]) unit = /kg/i.test(multi[2]) ? "kg" : "lbs";
    const xr = take(/^\s*[x×]\s*(\d+)\b/i); // "125/135/140 x5"
    if (xr) reps = +xr[1];
  }

  // Sets x reps (also "3xAMRAP", "3 x 24")
  let sr = take(/\b(\d+)\s*[x×]\s*(amrap|max)\b/i);
  if (sr) { nSets = +sr[1]; amrap = true; }
  else {
    sr = take(/\b(\d+)\s*[x×]\s*(\d+)\s*(sec|secs|seconds|s|cal|cals|calories)?\b/i);
    if (sr) {
      nSets = +sr[1]; reps = +sr[2];
      if (sr[3]) unit = /^c/i.test(sr[3]) ? "cal" : "sec";
    }
  }

  // Bands
  const band = take(new RegExp(`\\b(${COLORS}(?:\\s*(?:or|/|to)\\s*${COLORS})*)\\s+bands?\\b`, "i"));
  if (band) { unit = "band"; loadText = band[1].replace(/\s+/g, " ").toLowerCase(); }
  else if (/\bband(ed)?\b/i.test(rest)) { unit = unit || "band"; }

  // Per-set weights "125/135/135/140 lbs"
  if (!weights) {
    const single = take(/\b(\d+(?:\.\d+)?)\s*(lbs?|kg|#|pounds?)(?=[\s,]|$)/i);
    if (single) { weights = [+single[1]]; unit = /kg/i.test(single[2]) ? "kg" : "lbs"; }
  }

  // Time / calories without a sets x reps
  if (reps == null) {
    const t = take(/\b(\d+)\s*(sec|secs|seconds|s)\b/i);
    if (t) { unit = "sec"; reps = +t[1]; }
  }
  if (reps == null) {
    const c = take(/\b(\d+)\s*(cal|cals|calories)\b/i);
    if (c) { unit = "cal"; reps = +c[1]; }
  }
  if (/\bamrap\b/i.test(rest)) {
    rest = rest.replace(/\bamrap\b/i, " ");
    amrap = true;
    const n = take(/^\s*[:(]?\s*(\d+)\s*\)?(?=\s|$)/);
    if (n && reps == null) reps = +n[1];
  }
  if (take(/\b(bw|bodyweight|body weight)\b/i)) unit = unit === "band" ? unit : "bw";

  // Leftover lone number with no sets x reps = reps ("Pushups 20").
  if (reps == null && !amrap) {
    const lone = take(/\b(\d+)\b/);
    if (lone) reps = +lone[1];
  }

  const exercise = matchExercise(rawName, names);
  const name = exercise || rawName.replace(/\b\w/g, c => c.toUpperCase());
  const prevUnit = unitFor(name);
  const bwType = prevUnit === "bw" || (!prevUnit && BW_HINT.test(rawName));

  if (!unit) unit = weights ? (bwType ? "bw" : (prevUnit && prevUnit !== "bw" ? prevUnit : "lbs")) : (bwType ? "bw" : prevUnit || "bw");
  else if ((unit === "lbs") && bwType) unit = "bw"; // "Weighted dips 10lb" = BW+10

  if (nSets == null) nSets = weights && weights.length > 1 ? weights.length : 1;
  if (weights && weights.length > nSets) nSets = weights.length;

  const note = rest.replace(/\s+/g, " ").trim();
  const sets = [];
  for (let i = 0; i < nSets; i++) {
    const w = weights ? (weights[i] ?? weights[weights.length - 1]) : 0;
    sets.push({
      weight: unit === "band" || unit === "sec" || unit === "cal" ? 0 : w,
      reps: reps || 0,
      loadText: unit === "band" ? loadText : "",
      note: [amrap ? "AMRAP" : "", i === 0 && note ? note : ""].filter(Boolean).join(" · "),
    });
  }
  if (lastReps != null && sets.length) sets[sets.length - 1].reps = lastReps;

  if (!exercise) warnings.push("Not in your exercise list");
  if (sets.some(s => !(s.reps > 0))) warnings.push(amrap ? "AMRAP — enter the reps you got" : "Missing reps");
  if ((unit === "lbs" || unit === "kg") && sets.some(s => !(s.weight > 0))) warnings.push("Missing weight");

  return { exercise: name, matched: !!exercise, raw: line, unit, sets, warnings };
};

const HEADER_RE = /^(day|week|wk|session|workout|upper|lower|push|pull|legs?|full ?body|arms|chest|back)\b/i;

// Returns [{ name, date, entries: [...] }]
export const parseNotes = (text, opts = {}) => {
  const { names = [], templateNames = [], today = new Date() } = opts;
  const tplSet = new Set(templateNames.map(n => n.trim().toLowerCase()));
  const workouts = [];
  let cur = null;
  const ensure = () => { if (!cur) { cur = { name: "Workout", date: null, entries: [] }; workouts.push(cur); } return cur; };

  String(text).split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;
    const dateM = line.match(DATE_RE);
    const date = dateM ? parseDateToken(dateM[1], today) : null;
    const withoutDate = dateM ? line.replace(dateM[0], " ").replace(/[\s,–\-:]+/g, " ").trim() : line;
    const hasSetData = /\d+\s*[x×]\s*(\d|amrap)|\d\s*(lbs?|kg|#|sec|s|cal)\b|amrap|\bband\b|\d+\s*\/\s*\d+\s*(lbs?|kg)/i.test(withoutDate);
    const looksLikeName = withoutDate && !/\d/.test(withoutDate.replace(/^(day|week|wk)\s*\d+/i, "")) && !matchExercise(withoutDate, names);

    // Date-only line, or header line ("Day 1", "Upper A", "Lower – 10/14")
    if (date && (!withoutDate || /^(mon|tue|wed|thu|fri|sat|sun)\w*$/i.test(withoutDate))) {
      if (cur && !cur.entries.length) cur.date = date;
      else { cur = { name: "Workout", date, entries: [] }; workouts.push(cur); }
      return;
    }
    if (!hasSetData && (HEADER_RE.test(withoutDate) || tplSet.has(withoutDate.toLowerCase()) || /:$/.test(withoutDate) || looksLikeName)) {
      const name = withoutDate.replace(/:$/, "").trim() || "Workout";
      if (cur && !cur.entries.length && cur.name === "Workout") { cur.name = name; if (date) cur.date = date; }
      else { cur = { name, date, entries: [] }; workouts.push(cur); }
      return;
    }
    ensure().entries.push(parseExerciseLine(line, opts));
  });
  return workouts.filter(w => w.entries.length);
};
