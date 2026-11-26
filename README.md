A minimalist Silent Hill ARG landing page. Static HTML/CSS/JS, no build step, works on GitHub Pages.

AI & Human Coded Project.

Fan-made, not affiliated with Konami. No game assets are used.

The exit is locked behind a multi-step puzzle: find a hidden room page, decode a password, enter Fog World, then solve a final clue. Ambient audio is generated in the browser (toggle at top right). The full solution, every word the town answers to, and how to change them are in SPOILERS.md.

Files: index.html, style.css, script.js (game logic), engine.js (WebGL fog and Web Audio), room312.html (the hidden room), .nojekyll.

Visuals are a procedural fog shader with a flashlight that follows the cursor (it drifts on its own on touch screens), film grain, scanlines, and a Fog World mode. Falls back to a CSS gradient if WebGL is unavailable. All motion is reduced for visitors with prefers-reduced-motion.
