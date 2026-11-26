# You Live Here Now...

A minimalist Silent Hill ARG landing page. Static HTML/CSS/JS, no build step, works on GitHub Pages.

The browser tab reads **You Live Here Now...**

Fan-made, not affiliated with Konami. No game assets are used.

## Deploy on GitHub Pages

1. Create a new repo (e.g. `you-live-here-now`) and push these files to `main`.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. Visit `https://<your-username>.github.io/you-live-here-now/`.

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/you-live-here-now.git
git push -u origin main
```

## The safe redirect

At the top of `script.js`:

```js
var REDIRECT_URL = "https://en.wikipedia.org/wiki/Silent_Hill";
var ALLOWED_HOSTS = ["en.wikipedia.org", "github.com", "www.konami.com"];
```

Safety properties:

- The destination is hard-coded, never read from the query string, so the page can't be abused as an open redirect.
- HTTPS only, no embedded credentials, and the host must be on `ALLOWED_HOSTS`.
- The visitor sees the destination host and a 15-second countdown, and can press **Stay** to cancel.
- Link uses `rel="noopener noreferrer nofollow"` and `no-referrer`.

To point it elsewhere, change `REDIRECT_URL` and add its hostname to `ALLOWED_HOSTS`.

## Playing

The exit is locked behind a multi-step puzzle: find a hidden room page, decode a password, enter Fog World, then solve a final clue. Ambient audio is generated in the browser (toggle at top right). The full solution, every word the town answers to, and how to change them are in [SPOILERS.md](SPOILERS.md).

Files: `index.html`, `style.css`, `script.js`, `room312.html` (the hidden room), `.nojekyll`.
