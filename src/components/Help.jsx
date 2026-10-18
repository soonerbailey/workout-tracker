import React from "react";
import { colors } from "../constants.js";
import { S } from "./ui.jsx";

const Section = ({ title, children }) => (
  <div style={S.card}>
    <h3 style={{ color: colors.accentLight, fontSize: 16, margin: "0 0 10px" }}>{title}</h3>
    <div style={{ color: colors.textDim, fontSize: 14, lineHeight: 1.7 }}>{children}</div>
  </div>
);
const B = ({ children }) => <strong style={{ color: colors.text }}>{children}</strong>;

export function HelpGuide() {
  return (
    <div style={S.page}>
      <h2 style={{ ...S.h2, marginBottom: 6 }}>How to Use</h2>
      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>A quick walkthrough.</p>

      <Section title="Getting Started">
        <p>Tap <B>Sign in with Google</B> at the top. Your workouts then sync to every device you sign in on, and changes show up on your other devices within seconds. Without signing in, data is saved only in this browser.</p>
        <p style={{ marginTop: 8 }}>If you logged workouts before signing in, you'll be asked whether to add them to your account.</p>
      </Section>

      <Section title="Logging a Workout">
        <p>In <B>Log</B>, start from scratch, tap a <B>template</B>, or use <B>Paste from notes</B>. For each exercise you'll see what you did <B>last time</B>; tap <B>Repeat</B> to copy it or <B>Progress</B> to fill in the suggested next step.</p>
        <p style={{ marginTop: 8 }}>Your in-progress workout is kept while you switch tabs or close the app, until you save or clear it.</p>
        <p style={{ marginTop: 8 }}>Tap ⏱ next to a set (or a preset in the <B>Rest</B> bar) to start a rest timer. It beeps and vibrates (where supported) when time's up.</p>
      </Section>

      <Section title="Paste from Notes">
        <p>Paste workouts the way you write them on your phone, e.g.</p>
        <pre style={{ background: colors.bg, padding: 10, borderRadius: 8, fontSize: 12, color: colors.text, whiteSpace: "pre-wrap", margin: "8px 0" }}>{`Day 1
Zercher Squat 4x3 2 on last 205lb
OHP 4x5 125/135/135/140
Weighted dips AMRAP 10lb ball
Banded lateral walk 3x24 blue band
Hollow body hold 3x15 sec`}</pre>
        <p>Understands sets×reps, per-set weights (125/135/140), "2 on last", AMRAP, band colors, seconds, calories, lbs/kg and common abbreviations (OHP, RDL, DB, BB, KB). You review everything before it's saved.</p>
      </Section>

      <Section title="Editing and Deleting">
        <p>In <B>History</B>, expand a workout and tap <B>Edit</B> to change it, or <B>Delete</B> — you'll get an <B>Undo</B> button right after. Renaming an exercise in <B>Exercises</B> updates it everywhere in your history.</p>
      </Section>

      <Section title="Today's Suggestion">
        <p>If you train from templates, <B>Today</B> suggests the next one in your rotation (set the order under Exercises → Templates). Otherwise it picks the muscle groups you train that are most overdue, using the exercises you actually do.</p>
        <p style={{ marginTop: 8 }}>Targets come from your last session: for sets of 5 or fewer it adds weight once every set hits the reps; for 6–11 it adds a rep; at 12+ it adds weight and resets to 8. Bands, holds and calories progress by reps, seconds or calories.</p>
      </Section>

      <Section title="Tracking Progress">
        <p><B>Analytics</B> shows a chart per exercise. Weighted lifts show estimated 1-rep max, top weight or volume (lbs and kg are converted). Bodyweight lifts show max reps or added load; bands, holds and cardio show reps, seconds or calories. The dashed line is your trend over the next 8 weeks.</p>
        <p style={{ marginTop: 8 }}>Volume shows weekly sets per muscle group against a target, including groups you've skipped this week. Secondary muscles count as half a set.</p>
      </Section>

      <Section title="Backups">
        <p><B>Export Backup</B> saves a .json file. <B>Restore Backup</B> can either add what's missing (safe) or replace everything (with undo).</p>
      </Section>
    </div>
  );
}
