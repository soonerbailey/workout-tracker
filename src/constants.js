// ─── Data & Constants ────────────────────────────────────────────────
export const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Core", "Calves", "Cardio"];

export const UNITS = ["lbs", "kg", "bw", "band", "cal", "sec"];

// Weekly set targets per muscle group. null = no set target (tracked as sessions instead).
export const VOLUME_TARGETS = {
  Chest: 10, Back: 10, Shoulders: 10, Biceps: 8, Triceps: 8,
  Quads: 10, Hamstrings: 8, Glutes: 8, Core: 6, Calves: 6, Cardio: null,
};
// A secondary muscle counts as this fraction of a set.
export const SECONDARY_SET_WEIGHT = 0.5;

// `secondary` = other muscle groups that get meaningful work.
export const DEFAULT_EXERCISES = [
  // Chest
  { name: "Barbell Bench Press", muscleGroup: "Chest", type: "compound", secondary: ["Triceps", "Shoulders"] },
  { name: "Incline DB Chest Press", muscleGroup: "Chest", type: "compound", secondary: ["Shoulders", "Triceps"] },
  { name: "Incline Bench Press", muscleGroup: "Chest", type: "compound", secondary: ["Shoulders", "Triceps"] },
  { name: "Pushups", muscleGroup: "Chest", type: "compound", secondary: ["Triceps", "Shoulders"] },
  { name: "Diamond Pushups", muscleGroup: "Chest", type: "compound", secondary: ["Triceps"] },
  { name: "Weighted Dips", muscleGroup: "Chest", type: "compound", secondary: ["Triceps", "Shoulders"] },
  { name: "Cable Fly", muscleGroup: "Chest", type: "isolation", secondary: [] },
  // Quads
  { name: "Zercher Squat", muscleGroup: "Quads", type: "compound", secondary: ["Glutes", "Core"] },
  { name: "Barbell Back Squat", muscleGroup: "Quads", type: "compound", secondary: ["Glutes"] },
  { name: "Box Squat", muscleGroup: "Quads", type: "compound", secondary: ["Glutes"] },
  { name: "Rear Foot Elevated Split Squat", muscleGroup: "Quads", type: "compound", secondary: ["Glutes"] },
  { name: "Bulgarian Split Squat", muscleGroup: "Quads", type: "compound", secondary: ["Glutes"] },
  { name: "Air Squat", muscleGroup: "Quads", type: "compound", secondary: ["Glutes"] },
  { name: "Leg Press", muscleGroup: "Quads", type: "compound", secondary: ["Glutes"] },
  { name: "Leg Extension", muscleGroup: "Quads", type: "isolation", secondary: [] },
  // Hamstrings
  { name: "Toes Elevated BB RDL", muscleGroup: "Hamstrings", type: "compound", secondary: ["Glutes", "Back"] },
  { name: "Romanian Deadlift", muscleGroup: "Hamstrings", type: "compound", secondary: ["Glutes", "Back"] },
  { name: "Single Leg KB RDL", muscleGroup: "Hamstrings", type: "compound", secondary: ["Glutes"] },
  { name: "Leg Curl", muscleGroup: "Hamstrings", type: "isolation", secondary: [] },
  // Back
  { name: "Conventional Deadlift", muscleGroup: "Back", type: "compound", secondary: ["Hamstrings", "Glutes"] },
  { name: "Raised Trap Bar Deadlift", muscleGroup: "Back", type: "compound", secondary: ["Quads", "Glutes", "Hamstrings"] },
  { name: "Chest Supported DB Row", muscleGroup: "Back", type: "compound", secondary: ["Biceps"] },
  { name: "Barbell Row", muscleGroup: "Back", type: "compound", secondary: ["Biceps"] },
  { name: "Pull-Up", muscleGroup: "Back", type: "compound", secondary: ["Biceps"] },
  { name: "Neutral Grip Pull-Up", muscleGroup: "Back", type: "compound", secondary: ["Biceps"] },
  { name: "Seated Pulldown (Dual Pulley)", muscleGroup: "Back", type: "compound", secondary: ["Biceps"] },
  { name: "Lat Pulldown", muscleGroup: "Back", type: "compound", secondary: ["Biceps"] },
  { name: "Cable Row", muscleGroup: "Back", type: "isolation", secondary: ["Biceps"] },
  // Shoulders
  { name: "Overhead Press", muscleGroup: "Shoulders", type: "compound", secondary: ["Triceps"] },
  { name: "DB Clean + Press", muscleGroup: "Shoulders", type: "compound", secondary: ["Triceps", "Glutes"] },
  { name: "Lateral Raise", muscleGroup: "Shoulders", type: "isolation", secondary: [] },
  { name: "Face Pull", muscleGroup: "Shoulders", type: "isolation", secondary: ["Back"] },
  { name: "Rear Delt Fly", muscleGroup: "Shoulders", type: "isolation", secondary: [] },
  // Biceps
  { name: "Barbell Curl", muscleGroup: "Biceps", type: "isolation", secondary: [] },
  { name: "Dumbbell Curl", muscleGroup: "Biceps", type: "isolation", secondary: [] },
  { name: "Hammer Curl", muscleGroup: "Biceps", type: "isolation", secondary: [] },
  // Triceps
  { name: "Tricep Pulldown", muscleGroup: "Triceps", type: "isolation", secondary: [] },
  { name: "Skull Crushers", muscleGroup: "Triceps", type: "isolation", secondary: [] },
  { name: "Overhead Tricep Extension", muscleGroup: "Triceps", type: "isolation", secondary: [] },
  { name: "Close-Grip Bench Press", muscleGroup: "Triceps", type: "compound", secondary: ["Chest"] },
  // Glutes
  { name: "Hip Thrust", muscleGroup: "Glutes", type: "compound", secondary: ["Hamstrings"] },
  { name: "Single Leg Hip Thrust", muscleGroup: "Glutes", type: "compound", secondary: ["Hamstrings"] },
  { name: "Banded Lateral Walk", muscleGroup: "Glutes", type: "isolation", secondary: [] },
  // Core
  { name: "Half Kneeling Cable Lift", muscleGroup: "Core", type: "isolation", secondary: [] },
  { name: "Hollow Body Hold", muscleGroup: "Core", type: "isolation", secondary: [] },
  { name: "Plank", muscleGroup: "Core", type: "isolation", secondary: [] },
  { name: "Cable Crunch", muscleGroup: "Core", type: "isolation", secondary: [] },
  { name: "Turkish Get Up", muscleGroup: "Core", type: "compound", secondary: ["Shoulders"] },
  // Calves
  { name: "Calf Raise", muscleGroup: "Calves", type: "isolation", secondary: [] },
  // Cardio
  { name: "Air Bike", muscleGroup: "Cardio", type: "compound", secondary: [] },
  { name: "Rower", muscleGroup: "Cardio", type: "compound", secondary: [] },
  { name: "Ski Erg", muscleGroup: "Cardio", type: "compound", secondary: [] },
];

export const DEFAULT_SECONDARY = Object.fromEntries(DEFAULT_EXERCISES.map(e => [e.name, e.secondary]));

export const DEFAULT_TEMPLATES = [
  {
    id: "tpl-upper-a",
    name: "Upper A",
    exercises: [
      { exercise: "Barbell Bench Press", unit: "lbs", defaultSets: 3 },
      { exercise: "Incline DB Chest Press", unit: "lbs", defaultSets: 3 },
      { exercise: "Overhead Press", unit: "lbs", defaultSets: 3 },
      { exercise: "Chest Supported DB Row", unit: "lbs", defaultSets: 3 },
      { exercise: "Barbell Curl", unit: "lbs", defaultSets: 3 },
      { exercise: "Tricep Pulldown", unit: "lbs", defaultSets: 3 },
    ]
  },
  {
    id: "tpl-lower",
    name: "Lower",
    exercises: [
      { exercise: "Zercher Squat", unit: "lbs", defaultSets: 3 },
      { exercise: "Toes Elevated BB RDL", unit: "lbs", defaultSets: 3 },
      { exercise: "Leg Press", unit: "lbs", defaultSets: 3 },
      { exercise: "Leg Curl", unit: "lbs", defaultSets: 3 },
      { exercise: "Single Leg Hip Thrust", unit: "lbs", defaultSets: 3 },
      { exercise: "Calf Raise", unit: "lbs", defaultSets: 3 },
    ]
  },
  {
    id: "tpl-upper-b",
    name: "Upper B",
    exercises: [
      { exercise: "Raised Trap Bar Deadlift", unit: "lbs", defaultSets: 3 },
      { exercise: "Barbell Row", unit: "lbs", defaultSets: 3 },
      { exercise: "Pull-Up", unit: "bw", defaultSets: 3 },
      { exercise: "Weighted Dips", unit: "bw", defaultSets: 3 },
      { exercise: "Skull Crushers", unit: "lbs", defaultSets: 3 },
      { exercise: "Face Pull", unit: "lbs", defaultSets: 3 },
    ]
  },
];

export const REST_PRESETS = [60, 90, 120, 180];

// ─── Styles ──────────────────────────────────────────────────────────
export const colors = {
  bg: "#0f1117", card: "#1a1d27", cardHover: "#22263a", border: "#2a2e3f",
  accent: "#2d7ff9", accentLight: "#74b9ff", accentDim: "#1a5fc4",
  text: "#e8e8ef", textDim: "#8b8da3", textMuted: "#5a5c72",
  success: "#00b894", warning: "#fdcb6e", danger: "#e17055",
  chartColors: ["#2d7ff9", "#00b894", "#e17055", "#fdcb6e", "#74b9ff", "#fd79a8", "#55efc4", "#fab1a0", "#81ecec", "#a29bfe", "#dfe6e9"]
};
