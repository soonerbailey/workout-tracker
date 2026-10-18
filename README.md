# Workout Tracker

A personal workout tracker that runs in the browser and installs to your phone's home screen. It works offline, and when you sign in with Google your data syncs across devices.

## Features

- **Today**: suggests the next template in your rotation (Upper A → Lower → Upper B…), or the muscle groups you train that are most overdue. Each exercise gets a target based on your last session.
- **Log**:
  - Start from a template, from a suggestion, or by pasting from phone notes.
  - Each exercise shows your **last session**, with one-tap **Repeat** / **Progress** buttons.
  - Has a rest timer.
  - Your in-progress workout survives tab switches, reloads and closing the app.
- **Paste from notes**: understands lines like these:
  ```
  Day 1
  Zercher Squat 4x3 2 on last 205lb
  OHP 4x5 125/135/135/140
  Weighted dips AMRAP 10lb ball
  Banded lateral walk 3x24 blue or black band
  Hollow body hold 3x15 sec
  ```
- **History**: search, edit, delete with undo, and save a workout as a template.
- **Analytics**: charts are unit-aware:
  - Weighted lifts: estimated 1RM / top weight / volume, with lbs and kg converted.
  - Bodyweight: max reps / added load.
  - Bands, holds and cardio: reps, seconds or calories.
  - Trend lines use real dates.
  - Weekly sets per muscle group vs. targets, with secondary muscles counted as half a set.
- **Exercises**: library with primary and secondary muscles. Renaming an exercise updates your whole history.
- **Backups**: export JSON; restore by merging (safe) or by replacing everything (with undo).

## Project layout

```
src/                 app source (edit these)
  App.jsx            shell, navigation, app-level state (draft, rest timer)
  store.js           data layer: device storage when signed out, Firestore when signed in
  firebase.js        Firebase config + sign-in
  utils.js           dates, units, strength math, analytics, suggestions (pure functions)
  parser.js          phone-notes parser
  draft.js           in-progress workout helpers
  components/        one file per screen
  index.template.html, sw.template.js
test/                unit tests (node --test)
build.mjs            bundles src/ → app.js and writes index.html + sw.js
app.js, index.html, sw.js   GENERATED — commit them, but don't edit by hand
firestore.rules      Firestore security rules (must be published — see below)
```

## Developing

```bash
npm install          # once
npm run build        # after any change in src/
npm test             # unit tests
python3 -m http.server 8000   # then open http://localhost:8000/
```

The build bundles React, Recharts and Firebase into one file. Nothing is compiled in the browser and nothing loads from CDNs, so startup is fast and the app works fully offline after the first visit.

Commit the generated `app.js`, `index.html` and `sw.js` so GitHub Pages can serve them with no build step on GitHub.

## Data and sync

- **Signed out**: data is stored in this browser only.
- **Signed in**:
  - `users/{uid}` holds exercises and templates.
  - `users/{uid}/workouts/{id}` holds one document per workout.
  - Every open device listens for changes live.
  - Changes written offline are queued and sync later.
- **First sign-in after upgrading** from the old version: the old single-document workout list is copied into per-workout documents automatically. The old list is left in place as a backup.
- If you logged workouts on a device while signed out, you'll be asked whether to add them to your account when you sign in.

### Firestore rules (required)

The app needs the rules in `firestore.rules`, which allow each user to read and write their own `users/{uid}` document **and the documents under it**. Publish them in Firebase console → Firestore → Rules, or run `npx firebase-tools deploy --only firestore:rules`. If the rules don't allow the per-workout documents, the app shows a sync error saying the save was blocked.

### Signing in from the installed iPhone app

Inside a home-screen app the sign-in popup doesn't work, so the app uses a full-page redirect there. Safari's privacy protections can break that redirect when the app is hosted on a different domain from Firebase (e.g. GitHub Pages). If sign-in fails from the home-screen app:
- sign in once in Safari, then add to the home screen again; or
- host on Firebase Hosting (`npx firebase-tools deploy --only hosting`, config in `firebase.json`). The app then uses its own domain for sign-in automatically.
