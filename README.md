# DATA CENTER SIMULATION — POWERGRID PAL MANESAR

A 3D, browser-based educational game: run a 3-floor data center for 100 shifts,
fix power/cooling/server incidents, catch intruders, and complete hands-on terminal
labs (Linux, Cisco-style switching/routing/ACLs, firewall, proxy, SIEM, EDR, PAM).

## Files
index.html        page, styles, HUD; loads Three.js r128 + bloom from CDN
js/world.js       building layout, rooms, equipment, NPCs, save/audio helpers
js/codex.js       51 learning entries (the in-game Codex)
js/labs.js        terminal engine + 23 hands-on labs
js/incidents.js   incident templates + level/shift planning (100 shifts)
js/render.js      Three.js 3D renderer, characters, effects, GTA-style minimap
js/game.js        game state, interaction, puzzles, HUD, menus, input, main loop
netlify.toml      Netlify settings (no build needed)
assets/           client logos shown on the reception brand wall (replace files to change them)

## Run locally
Any static server works, e.g.:
    python3 -m http.server 8000
then open http://localhost:8000

## Deploy to Netlify
Option A (drag & drop): go to https://app.netlify.com/drop and drop this folder.
Option B (CLI):
    npm install -g netlify-cli
    netlify login
    netlify deploy --dir . --prod
Option C (Git): push this folder to GitHub, then in Netlify: Add new site →
Import from Git → pick the repo → build command: (leave empty) → publish directory: .

## Inauguration / kiosk tips
- Use the ⛶ Fullscreen button (or F11) on the display PC.
- "⚡ Visitor Challenge" = a 3-minute round for walk-in visitors, with a local Top-10 leaderboard.
- After 45 s with no input the menu switches to an attract screen (flyover + "Press any key").
  A game left idle for 3 minutes returns to the menu automatically.
- Leaderboard and progress are stored in that browser (localStorage). Clear site data to reset.
- Music: 🎵 button + volume slider in the top bar (music is generated live — no audio files).
- Graphics: Low in the menu if the display PC is slow (reload after changing).
