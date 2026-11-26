# SPOILERS: full solution

Stop reading if you want to play it blind.

## The chain

| Stage | What you do | Answer |
|---|---|---|
| 1. The street | Talk to the town. Typing `312`, `lakeview` or `room312` says "Room 312 is not on any street. Some doors are only reachable by address." | Go to `/room312.html` |
| 1b. Other ways to find the clue | HTML comment in the page source, and a styled message in the browser console | Same hint |
| 2. Room 312 | Read the letter on `room312.html`. The first letter of each line spells the password. Clicking the TV gives escalating hints. | `DREAMS` |
| 3. Fog World | Type `dreams` on the main page. The site flips to the rusty Otherworld look. Type `siren`: the siren is reading the door number "three, one, two" and it sounds wrong. | `213` (312 backwards) |
| 4. Exit | Type `leave`. A box shows the destination host and a 15-second countdown, with a Stay button. | Redirect |

The acrostic: **D**o not answer... / **R**ain runs... / **E**very door... / **A**t night... / **M**y handwriting... / **S**tay if you must...

## Rules the game enforces

- `213` only works after entering Fog World. Before that it answers "Nothing answers."
- `leave` before solving gives a hint (street: look for the room not on the map; Fog World: the door numbers are wrong).
- Progress lasts for the browser session (sessionStorage); closing the tab resets it.

## Every word the town answers to

**Places:** `toluca` / `lake`, `brookhaven`, `alchemilla`, `midwich`, `rosewater`, `lakeview` / `312` / `room312`

**Characters:** `alessa`, `cheryl`, `harry`, `james`, `mary`, `laura`, `angela`, `eddie`, `maria`, `lisa`, `cybil`, `kaufmann`, `dahlia`, `claudia`

**Things:** `order`, `halo`, `pyramid`, `radio`, `siren`, `fog`, `otherworld`, `help`

**Fog World only changes:** `siren` (the hint), `radio`, `fog`, `order`, `rust`, `grate`, `lakeview`, `312`, `help`

## Audio

Generated in the browser with no audio files: radio static with occasional bursts, a low drone, and a siren on the `siren` command. It starts on the first keystroke or click, and the **sound** toggle (top right) mutes it.
