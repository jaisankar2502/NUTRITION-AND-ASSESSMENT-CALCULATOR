# Nutrition & Assessment Calculator

A React + Vite web app that calculates BMI, BMR, and TDEE from a user profile, breaks that down into daily macro targets, and lets you build out a full day's meal plan (Breakfast/Lunch/Dinner/Snacks) against a searchable food database — plus a free-form food log with running totals.

The UI is built as one responsive layout with a light/dark theme toggle, and is styled with a platform-neutral CSS reset (see [UI & Cross-Platform Consistency](#ui--cross-platform-consistency) below) so it looks and behaves the same on desktop browsers, Android, iPhone, and Mac instead of inheriting each platform's native form control styling.

## Features

- **Profile input** — age, sex, weight (kg/lb), height (cm/in), activity level
- **Automatic metrics** — BMI (with category), BMR, and TDEE, recalculated live
- **Macro targets** — protein/carbs/fat breakdown driven by an editable percentage ratio
- **Nutrition plan generator** — splits your TDEE across Breakfast/Lunch/Dinner/Snacks, with a full-page food search/editor per meal and a remaining-calories readout
- **Food log** — pick from a built-in food database (scaled by grams) or enter custom items, with running totals for calories/protein/carbs/fat
- **Save/load plan** — persists the generated nutrition plan to `localStorage`
- **Light/dark theme** — toggle in the top nav, preference saved to `localStorage`

## Tech Stack

- [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/) (`@vitejs/plugin-react`)
- Plain CSS (`src/styles.css`) — no CSS framework or component library
- [Lucide](https://lucide.dev/) for icons
- [Three.js](https://threejs.org/) via `@react-three/fiber`/`@react-three/drei` for the 3D macro chart in the Food log — lazy-loaded so it doesn't add to the initial bundle
- No backend — all state is in-memory/`localStorage`

## Project Structure

```text
index.html          Vite entry HTML (viewport/meta config lives here)
src/
  main.jsx          React root, mounts <App /> and imports styles.css
  App.jsx            All app state, calculations, and UI
  foodData.js        Built-in food database (name, macros, base grams)
  styles.css          Global styles: reset, theme variables, layout, components
```

## Setup

Requires [Node.js](https://nodejs.org/) 18+ and npm.

1. Open the project folder in VS Code (or your editor of choice).
2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the dev server:

   ```sh
   npm run dev
   ```
   Vite will print a local URL (typically `http://localhost:5173`) — open it in a browser.

### Other scripts

- `npm run build` — production build to `dist/`
- `npm run preview` — serve the `dist/` build locally to sanity-check before deploying

## UI & Cross-Platform Consistency

Browsers apply their own native chrome to form elements (buttons, `<select>` arrows, input padding, tap highlights, auto-zoom on focus, etc.), and that native chrome differs across Chrome/Android, Safari/iOS, Safari/macOS, and desktop browsers. `src/styles.css` starts with a reset block that strips this platform-specific styling (`appearance: none`, a custom `<select>` arrow drawn with inline SVG, `-webkit-tap-highlight-color`, a 16px minimum input font size to prevent iOS auto-zoom, etc.) so every control is styled explicitly by the app's own CSS instead. On top of that:

- Layout is fluid/grid-based with breakpoints at 840px, 640px, and 480px so it adapts from phone to tablet to desktop.
- `index.html` sets `viewport-fit=cover` and the layout pads for `env(safe-area-inset-*)`, so content clears the notch/home-indicator on iPhone.
- `theme-color` and `apple-mobile-web-app-*` meta tags keep the browser chrome/status bar consistent with the app's theme when added to a home screen on iOS/Android.

## Notes

This project is a starter implementation. If you want Excel-specific formulas or additional assessment features from a reference workbook, share the workbook details or upload the project files.
