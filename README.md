# Workout Tracker

A React-based workout tracking app with analytics, progressive overload tracking, and smart workout suggestions. Runs entirely in the browser with no backend required.

## Features

- **5 Main Views**
  - **Log**: Record workouts with exercises, sets, reps, weights, and notes
  - **History**: Browse past workouts with expandable details
  - **Analytics**: Track estimated 1RM progression and weekly volume per muscle group
  - **Today**: Get workout suggestions based on which muscles need training
  - **Exercises**: Manage your exercise library (add/edit/delete)

- **Multi-Unit Support**: Track in lbs, kg, bodyweight, bands, calories, or seconds
- **Notes Per Set**: Add context like "AMRAP", "blue band", tempo notes, etc.
- **Smart Suggestions**: Progressive overload recommendations based on your last performance
- **Volume Tracking**: Weekly sets per muscle group with targets
- **Export/Import**: Save your data as JSON to persist between sessions

## Usage

### On Desktop
1. Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge)
2. Start logging workouts or explore the sample data
3. Export your data periodically to save progress

### On Mobile
1. Save `index.html` to your device (via email, AirDrop, cloud storage, etc.)
2. Open it in your mobile browser (Safari on iPhone, Chrome on Android)
3. Bookmark it or add to home screen for quick access

### Live Demo
GitHub Pages: https://brewdailey.github.io/workout-tracker (coming soon)

## Data Persistence

**Important**: The app stores data in memory only. To save your progress:

1. Click **Export JSON** at the bottom of the app
2. Save the downloaded file somewhere safe (cloud storage recommended)
3. To restore: Click **Import JSON** and paste your data

## Exercise List

The app comes preloaded with 60+ exercises organized by muscle group:
- **Chest**: Bench Press, Incline DB Press, Weighted Dips, Pushups, etc.
- **Quads**: Zercher Squat, Box Squat, Split Squats, Leg Press, etc.
- **Hamstrings**: RDLs, Single Leg KB RDL, Leg Curl, etc.
- **Back**: Deadlifts, Rows, Pull-Ups, Pulldowns, etc.
- **Shoulders**: Overhead Press, DB Clean + Press, Lateral Raises, Face Pulls, etc.
- **Glutes**: Hip Thrusts, Banded Lateral Walks, etc.
- **Core**: Turkish Get Ups, Hollow Body Holds, Planks, etc.
- **Cardio**: Air Bike, Rower, Ski Erg, etc.
- Plus biceps, triceps, and calves

You can add custom exercises in the **Exercises** tab.

## Sharing

Want to share with friends or training partners?

1. Send them `index.html` (or the GitHub link)
2. Their data stays completely separate from yours
3. To share your actual workout data, export your JSON and send that too

## Technical Details

- **Built with**: React 18, Recharts for visualizations
- **No installation required**: Pure HTML/JS, runs client-side
- **Privacy**: All data stays local on your device
- **Mobile-friendly**: Responsive design works on phones and tablets

## Development

The app is a single React component (`workout-tracker.jsx`) with an HTML wrapper. To modify:

1. Edit `workout-tracker.jsx` for the app logic
2. Edit `index.html` if you need to change dependencies or layout
3. Open in browser to test changes immediately

## License

MIT License - feel free to use, modify, and share!

## Credits

Built with Claude (Anthropic) by Drew Bailey
