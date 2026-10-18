import { test } from "node:test";
import assert from "node:assert/strict";
import * as U from "../src/utils.js";
import { DEFAULT_EXERCISES, DEFAULT_TEMPLATES } from "../src/constants.js";

const W = (id, date, name, entries) => ({ id, date, name, entries });
const E = (exercise, unit, sets) => ({ exercise, unit, sets: sets.map(([weight, reps, extra]) => ({ weight, reps, note: "", loadText: "", ...(extra || {}) })) });

test("local dates", () => {
  const evening = new Date(2026, 9, 15, 21, 30); // 9:30pm local
  assert.equal(U.localDateStr(evening), "2026-10-15");
  assert.equal(U.weekStart("2026-10-15"), "2026-10-12"); // Thursday -> Monday
  assert.equal(U.daysBetween("2026-10-12", "2026-10-15"), 3);
  assert.equal(U.addDays("2026-10-30", 7), "2026-11-06");
});

test("best set is unit aware", () => {
  assert.equal(U.bestSet([{ weight: 0, reps: 8 }, { weight: 0, reps: 12 }], "bw").reps, 12);
  assert.equal(U.bestSet([{ weight: 10, reps: 6 }, { weight: 0, reps: 15 }], "bw").weight, 10);
  assert.equal(U.bestSet([{ weight: 0, reps: 20, loadText: "blue" }], "band").reps, 20);
  assert.equal(U.bestSet([{ weight: 200, reps: 3 }, { weight: 185, reps: 8 }], "lbs").weight, 185);
  assert.equal(U.bestSet([], "lbs"), null);
});

test("analytics series converts kg and never computes e1RM for bodyweight", () => {
  const ws = [
    W("a", "2026-09-01", "x", [E("Overhead Press", "lbs", [[100, 5]])]),
    W("b", "2026-09-08", "x", [E("Overhead Press", "kg", [[50, 5]])]),
    W("c", "2026-09-08", "x", [E("Weighted Dips", "bw", [[10, 8], [0, 12]])]),
  ];
  const s = U.exerciseSeries(ws, "Overhead Press", "load", "e1rm", "lbs");
  assert.equal(s.length, 2);
  assert.ok(Math.abs(s[1].value - Math.round(50 * 2.20462 * (1 + 5 / 30))) <= 1);
  const info = U.exerciseUnitInfo(ws, "Weighted Dips");
  assert.deepEqual(info.categories, ["bw"]);
  assert.equal(U.exerciseSeries(ws, "Weighted Dips", "bw", "maxreps", "lbs")[0].value, 12);
  assert.equal(U.exerciseSeries(ws, "Weighted Dips", "bw", "topadded", "lbs")[0].value, 10);
});

test("projection uses real dates", () => {
  const series = ["2026-08-01", "2026-08-15", "2026-08-29", "2026-09-26"].map((d, i) => ({ date: d, t: U.parseLocalDate(d).getTime(), value: 200 + i * 10 }));
  const p = U.projectSeries(series);
  assert.ok(p);
  assert.equal(p.points.length, 5);
  assert.equal(p.points[1].date, "2026-10-10");
  assert.ok(p.slopePerWeek > 0);
  assert.equal(U.projectSeries(series.slice(0, 2)), null);
});

test("volume counts secondary muscles at half", () => {
  const idx = U.buildExerciseIndex(DEFAULT_EXERCISES);
  const v = U.weeklyVolume([W("a", "2026-10-13", "x", [E("Romanian Deadlift", "lbs", [[135, 8], [135, 8], [135, 8]])])], idx);
  assert.equal(v["2026-10-12"].Hamstrings, 3);
  assert.equal(v["2026-10-12"].Glutes, 1.5);
  // library without a secondary field (old saved data) falls back to defaults
  const idxOld = U.buildExerciseIndex([{ name: "Romanian Deadlift", muscleGroup: "Hamstrings", type: "compound" }]);
  assert.deepEqual(idxOld.get("Romanian Deadlift").secondary, ["Glutes", "Back"]);
});

test("progression rules", () => {
  assert.match(U.progressionFor(E("Zercher Squat", "lbs", [[205, 3], [205, 3], [205, 3], [205, 2]])).note, /Repeat/);
  const p = U.progressionFor(E("Zercher Squat", "lbs", [[205, 3], [205, 3], [205, 3]]));
  assert.equal(p.weight, 210); assert.equal(p.reps, 3); assert.equal(p.sets, 3);
  assert.equal(U.progressionFor(E("Squat", "kg", [[100, 3]])).weight, 102.5);
  assert.equal(U.progressionFor(E("Curl", "lbs", [[30, 9]])).reps, 10);
  assert.equal(U.progressionFor(E("Banded Lateral Walk", "band", [[0, 24, { loadText: "blue" }]])).note, "20+ reps — try a heavier band");
  assert.equal(U.progressionFor(E("Plank", "sec", [[0, 30]])).reps, 35);
  assert.equal(U.progressionFor(E("Pull-Up", "bw", [[0, 8]])).reps, 9);
});

test("today: follows template rotation", () => {
  const ws = [
    W("1", "2026-10-08", "Upper A", [E("Barbell Bench Press", "lbs", [[185, 5]])]),
    W("2", "2026-10-10", "Lower", [E("Zercher Squat", "lbs", [[205, 3]])]),
  ];
  const s = U.suggestToday({ workouts: ws, exercises: DEFAULT_EXERCISES, templates: DEFAULT_TEMPLATES, today: "2026-10-12" });
  assert.equal(s.type, "rotation");
  assert.equal(s.template.name, "Upper B");
});

test("today: muscle mode prefers exercises you do, ignores never-trained groups", () => {
  const ws = [
    W("1", "2026-10-01", "Pull", [E("Raised Trap Bar Deadlift", "lbs", [[315, 5]])]),
    W("2", "2026-10-09", "Push", [E("Barbell Bench Press", "lbs", [[185, 5]])]),
  ];
  const s = U.suggestToday({ workouts: ws, exercises: DEFAULT_EXERCISES, templates: [], today: "2026-10-12" });
  assert.equal(s.type, "muscles");
  assert.ok(!s.muscles.some(m => m.muscle === "Calves"));
  assert.equal(s.muscles[0].muscle, "Back");
  assert.equal(s.suggestions[0].exercise, "Raised Trap Bar Deadlift");
});

test("merge keeps existing and adds new", () => {
  const cur = { workouts: [W("a", "2026-10-01", "x", [])], exercises: [{ name: "A" }], templates: [{ id: "t1" }] };
  const inc = { workouts: [W("a", "2026-10-01", "changed", []), W("b", "2026-09-01", "y", [])], exercises: [{ name: "a" }, { name: "B" }], templates: [{ id: "t1" }, { id: "t2" }] };
  const m = U.mergeData(cur, inc);
  assert.deepEqual(m.workouts.map(w => w.id), ["b", "a"]);
  assert.equal(m.workouts[1].name, "x");
  assert.deepEqual(m.added, { workouts: 1, exercises: 1, templates: 1 });
});

test("rename cascades", () => {
  const w = W("a", "2026-10-01", "x", [E("Pull-Up", "bw", [[0, 8]])]);
  assert.equal(U.renameInWorkout(w, "Pull-Up", "Pullup", "Back").entries[0].exercise, "Pullup");
  assert.equal(U.renameInWorkout(w, "Nope", "X"), null);
});
