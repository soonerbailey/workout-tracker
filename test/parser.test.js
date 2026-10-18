import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNotes, parseExerciseLine, matchExercise, parseDateToken } from "../src/parser.js";
import { DEFAULT_EXERCISES } from "../src/constants.js";

const names = DEFAULT_EXERCISES.map(e => e.name);
const opts = { names, templateNames: ["Upper A", "Lower", "Upper B"], today: new Date(2026, 9, 15) };

test("Drew's sample day parses", () => {
  const ws = parseNotes(`Day 1
Zercher Squat 4x3 2 on last 205lb
Incline DB chest press 4x3 90lb
Weighted dips AMRAP 10lb ball
Banded lateral walk 3x24 Blue or black band`, opts);
  assert.equal(ws.length, 1);
  const [w] = ws;
  assert.equal(w.name, "Day 1");
  assert.equal(w.entries.length, 4);

  const [zs, inc, dips, walk] = w.entries;
  assert.equal(zs.exercise, "Zercher Squat");
  assert.equal(zs.unit, "lbs");
  assert.deepEqual(zs.sets.map(s => [s.weight, s.reps]), [[205, 3], [205, 3], [205, 3], [205, 2]]);

  assert.equal(inc.exercise, "Incline DB Chest Press");
  assert.deepEqual(inc.sets.map(s => [s.weight, s.reps]), [[90, 3], [90, 3], [90, 3], [90, 3]]);

  assert.equal(dips.exercise, "Weighted Dips");
  assert.equal(dips.unit, "bw");
  assert.equal(dips.sets[0].weight, 10);
  assert.match(dips.sets[0].note, /AMRAP/);
  assert.match(dips.sets[0].note, /ball/);
  assert.ok(dips.warnings.some(x => /AMRAP/.test(x)));

  assert.equal(walk.exercise, "Banded Lateral Walk");
  assert.equal(walk.unit, "band");
  assert.equal(walk.sets.length, 3);
  assert.equal(walk.sets[0].reps, 24);
  assert.equal(walk.sets[0].loadText, "blue or black");
});

test("per-set weights and abbreviations", () => {
  const e = parseExerciseLine("OHP 4x5 125/135/135/140", { names });
  assert.equal(e.exercise, "Overhead Press");
  assert.deepEqual(e.sets.map(s => s.weight), [125, 135, 135, 140]);
  assert.ok(e.sets.every(s => s.reps === 5));
  const r = parseExerciseLine("OHP: 125/135/135/140 x5", { names });
  assert.equal(r.sets.length, 4);
});

test("time, kg, cal, unknown exercise, date header", () => {
  assert.equal(parseExerciseLine("Hollow Body Hold 15 sec", { names }).unit, "sec");
  assert.equal(parseExerciseLine("Hollow Body Hold 15 sec", { names }).sets[0].reps, 15);
  const hb = parseExerciseLine("Hollow body hold 3x20s", { names });
  assert.equal(hb.unit, "sec"); assert.equal(hb.sets.length, 3); assert.equal(hb.sets[0].reps, 20);
  const kg = parseExerciseLine("Turkish get up 3x2 24kg", { names });
  assert.equal(kg.exercise, "Turkish Get Up"); assert.equal(kg.unit, "kg"); assert.equal(kg.sets[0].weight, 24);
  const bike = parseExerciseLine("Air bike 20 cal", { names });
  assert.equal(bike.unit, "cal"); assert.equal(bike.sets[0].reps, 20);
  const unk = parseExerciseLine("Sled push 4x40 90lb", { names });
  assert.equal(unk.matched, false); assert.equal(unk.exercise, "Sled Push");
  const ws = parseNotes("Upper A 10/13\nBench 3x5 185lb\nPull ups 3x8", opts);
  assert.equal(ws[0].name, "Upper A");
  assert.equal(ws[0].date, "2026-10-13");
  assert.equal(ws[0].entries[0].exercise, "Barbell Bench Press");
  assert.equal(ws[0].entries[1].exercise, "Pull-Up");
  assert.equal(ws[0].entries[1].unit, "bw");
});

test("multiple days", () => {
  const ws = parseNotes("Day 1\nZercher squat 3x5 185lb\n\nDay 2\nRDL 3x8 135lb", opts);
  assert.equal(ws.length, 2);
  assert.equal(ws[1].entries[0].exercise, "Romanian Deadlift");
});

test("matching + dates", () => {
  assert.equal(matchExercise("single leg kb rdl", names), "Single Leg KB RDL");
  assert.equal(matchExercise("trap bar deadlift", names), "Raised Trap Bar Deadlift");
  assert.equal(matchExercise("pushups", names), "Pushups");
  assert.equal(parseDateToken("12/30", new Date(2026, 0, 5)), "2025-12-30");
});
