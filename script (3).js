(function () {
  "use strict";

  /* ================================================================
     CONFIG: the redirect destination is hard-coded and checked against
     an allowlist. It is never read from the URL (no open redirect).
     ================================================================ */
  var REDIRECT_URL = "https://en.wikipedia.org/wiki/Silent_Hill";
  var ALLOWED_HOSTS = ["en.wikipedia.org", "github.com", "www.konami.com"];
  var COUNTDOWN_SECONDS = 15;

  var SH = window.SH || { fx: {}, audio: {} };
  var AU = SH.audio, FX = SH.fx;
  function call(o, k, a) { try { if (o && o[k]) o[k](a); } catch (e) {} }

  /* ---------- hidden clue for people who open the console ---------- */
  try {
    console.log(
      "%cRoom 312 is not on the map.%c\nSome doors are only reachable by address.",
      "color:#b8402f;font-family:monospace;font-size:14px",
      "color:#888;font-family:monospace"
    );
  } catch (e) {}

  /* ---------- places (drive the location label and the map marks) ---------- */
  var PLACE = {
    toluca: "toluca", lake: "toluca",
    rosewater: "rosewater",
    lakeview: "lakeview", "312": "lakeview", room312: "lakeview",
    brookhaven: "brookhaven",
    alchemilla: "alchemilla",
    midwich: "midwich"
  };
  var PLACE_NAME = {
    toluca: "Toluca Lake", rosewater: "Rosewater Park", lakeview: "Lakeview Hotel",
    brookhaven: "Brookhaven Hospital", alchemilla: "Alchemilla Hospital", midwich: "Midwich Elementary"
  };

  /* ---------- town responses (Stage 1) ---------- */
  var HOTEL = "Lakeview Hotel. Room 312 is not on any street. Some doors are only reachable by address.";
  var RESPONSES = {
    "toluca": "Toluca Lake. The ferry stopped running a long time ago.",
    "lake": "Toluca Lake. The ferry stopped running a long time ago.",
    "brookhaven": "Brookhaven Hospital. Someone is still on the night shift.",
    "alchemilla": "Alchemilla Hospital. The lights are on. Nobody turned them on.",
    "midwich": "Midwich Elementary. Class is in session.",
    "rosewater": "Rosewater Park. The benches face the water. You should not sit.",
    "lakeview": HOTEL,
    "312": HOTEL,
    "room312": HOTEL,
    "alessa": "She is still burning. She is still waiting.",
    "cheryl": "You hear a child's voice, very far away. It might be calling someone else.",
    "harry": "He searched for a long time. You are not him.",
    "james": "A letter arrived. You have read it. You do not remember reading it.",
    "mary": "She is not here. Stop looking.",
    "laura": "She is not afraid of the town. She was never afraid of it the way you are.",
    "angela": "She is looking for someone who already knows where she went.",
    "eddie": "He keeps apologizing to people who are not listening.",
    "maria": "She looks like someone you know. She would like you to stop saying so.",
    "lisa": "Still bandaging someone who is not there. Still kind about it.",
    "cybil": "She should have turned back at the edge of town.",
    "kaufmann": "A doctor with a full supply cabinet and a great deal of free time.",
    "dahlia": "She believes the town is a promise. She has believed it for a very long time.",
    "claudia": "She says the town is a promise. She is not lying.",
    "order": "The Order has never left. It only changed its name.",
    "halo": "A symbol on the wall. A circle, with something small caught in the middle.",
    "pyramid": "Something heavy is being dragged on the other side of the wall. It is here for one person. Not you.",
    "radio": "<span class='bad'>kkkk...  kssshh... it is close. it is close.</span>",
    "siren": "SIREN",
    "fog": "You cannot see more than a few steps. You never could.",
    "otherworld": "You are not there yet. The town has to want you to be.",
    "help": "Words the town knows: names, places, and the thing in your pocket. Some doors are only reachable by address. Type <b>map</b> to see where you have been."
  };

  /* ---------- Fog World overrides (Stage 3) ---------- */
  var OW_RESPONSES = {
    "siren": "OWSIREN",
    "radio": "<span class='bad'>the static is saying numbers. you are not the first to listen.</span>",
    "fog": "The fog was never weather. It is a held breath.",
    "order": "Their symbols are drawn here in rust, over everything.",
    "rust": "It spreads while you read. It is the only thing here that is honest.",
    "grate": "Below it is a very long drop, and something looking up.",
    "lakeview": "The hotel is the same hotel. The hallway is longer. The door numbers are wrong.",
    "312": "It is on a door in front of you. It looks backwards, or you are.",
    "help": "Listen to the siren. Then read the door the way the other side reads it."
  };

  var $ = function (id) { return document.getElementById(id); };
  var log = $("log"), form = $("prompt"), input = $("input"), main = $("main");
  var exitBox = $("exit"), exitLink = $("exit-link");
  var count = $("count"), destHost = $("dest-host"), cancel = $("cancel");
  var h1 = $("title"), meta = $("meta"), loc = $("loc");
  var mapEl = $("map"), mapBtn = $("mapBtn"), mapClose = $("mapClose");
  var timer = null;

  var state = { ow: false, solved: false };
  function store(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  /* ---------- helpers ---------- */
  function line(html, cls) {
    var p = document.createElement("p");
    if (cls) p.className = cls;
    p.innerHTML = html;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    if (cls !== "you") call(AU, "blip");
  }

  function type(text, cls, done) {
    var p = document.createElement("p");
    if (cls) p.className = cls;
    log.appendChild(p);
    var i = 0;
    (function tick() {
      p.textContent = text.slice(0, ++i);
      log.scrollTop = log.scrollHeight;
      if (i < text.length) setTimeout(tick, 26 + Math.random() * 28);
      else if (done) done();
    })();
  }

  /* ---------- visited places and the map ---------- */
  function getVisited() {
    var v = load("visited");
    return v ? v.split(",") : [];
  }
  function visit(id) {
    var v = getVisited();
    if (v.indexOf(id) === -1) { v.push(id); store("visited", v.join(",")); }
    if (!state.ow) loc.textContent = PLACE_NAME[id];
  }
  function refreshMap() {
    var v = getVisited();
    var els = document.querySelectorAll("[data-mark]");
    for (var i = 0; i < els.length; i++) {
      var id = els[i].getAttribute("data-mark");
      var on = id === "room312" ? load("room312") === "1" : v.indexOf(id) > -1;
      els[i].style.display = on ? "inline" : "none";
    }
  }
  function openMap() { refreshMap(); mapEl.hidden = false; mapClose.focus(); }
  function closeMap() { mapEl.hidden = true; input.focus(); }
  mapBtn.addEventListener("click", openMap);
  mapClose.addEventListener("click", closeMap);
  mapEl.addEventListener("click", function (e) { if (e.target === mapEl) closeMap(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !mapEl.hidden) closeMap(); });

  /* ---------- Fog World ---------- */
  function applyOtherworld(animate) {
    document.body.classList.add("otherworld");
    h1.textContent = "You never left...";
    h1.setAttribute("data-text", "You never left...");
    meta.innerHTML = "Silent Hill &middot; The other side";
    loc.textContent = "The other side";
    input.placeholder = "say something to the dark";
    call(FX, "setOw", 1);
    call(AU, "setLevel", 1);
    if (!animate && FX.ow !== undefined) FX.ow = 1;
  }

  function enterOtherworld() {
    state.ow = true; store("ow", "1");
    applyOtherworld(true);
    call(FX, "pulse");
    call(AU, "boom");
    call(AU, "siren");
    document.body.classList.add("siren");
    main.classList.add("shake");
    setTimeout(function () { main.classList.remove("shake"); }, 800);
    setTimeout(function () { document.body.classList.remove("siren"); }, 6000);
    line("The street peels back like wallpaper. Rust. Wire. A grate under your feet.", "bad");
    line("The exit you were looking for is not where it was.", "sys");
  }

  /* ---------- safe redirect ---------- */
  function safeDestination() {
    try {
      var u = new URL(REDIRECT_URL);
      if (u.protocol !== "https:") return null;
      if (u.username || u.password) return null;
      if (ALLOWED_HOSTS.indexOf(u.hostname) === -1) return null;
      return u;
    } catch (e) { return null; }
  }

  function showExit() {
    var dest = safeDestination();
    if (!dest) {
      line("The road is blocked. (Redirect target failed validation.)", "bad");
      return;
    }
    destHost.textContent = dest.hostname;
    exitLink.href = dest.href;
    exitBox.hidden = false;
    form.hidden = true;

    var left = COUNTDOWN_SECONDS;
    count.textContent = "(" + left + ")";
    timer = setInterval(function () {
      left--;
      count.textContent = "(" + left + ")";
      if (left <= 0) {
        clearInterval(timer);
        window.location.replace(dest.href);
      }
    }, 1000);
  }

  cancel.addEventListener("click", function () {
    clearInterval(timer);
    exitBox.hidden = true;
    form.hidden = false;
    count.textContent = "";
    line("You decide to stay. The town noticed.", "sys");
    input.focus();
  });

  /* ---------- title glitch ---------- */
  setInterval(function () {
    if (Math.random() < 0.35) {
      h1.classList.add("glitch");
      setTimeout(function () { h1.classList.remove("glitch"); }, 140);
    }
  }, 2600);

  /* ---------- typing sound ---------- */
  input.addEventListener("keydown", function (e) {
    if (e.key.length === 1 || e.key === "Backspace") call(AU, "tick");
  });

  /* ---------- command handling ---------- */
  function sirenPulse() {
    document.body.classList.add("siren");
    call(FX, "pulse");
    call(AU, "siren");
    setTimeout(function () { document.body.classList.remove("siren"); }, 6000);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = input.value.trim();
    input.value = "";
    if (!raw) return;

    line("&rsaquo; " + raw.replace(/[<>&]/g, ""), "you");
    var key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (key === "map") { openMap(); return; }

    /* Stage 2 answer: the acrostic from room312.html */
    if (key === "dreams") {
      if (state.ow) line("You are already here.", "sys");
      else enterOtherworld();
      return;
    }

    /* Stage 3 answer: the room number read backwards */
    if (key === "213") {
      if (!state.ow) { line("Nothing answers.", "sys"); return; }
      if (state.solved) { line("The door is already open.", "sys"); return; }
      state.solved = true; store("solved", "1");
      call(AU, "door");
      line("The door swings inward onto a road with fog on it, and a way out that is only a little bit true.", "bad");
      line("Type <b>leave</b> when you are ready.", "sys");
      return;
    }

    if (key === "leave" || key === "exit") {
      if (state.solved) { line("All right.", "sys"); showExit(); }
      else if (state.ow) line("The road is closed. The numbers on the door are wrong.", "sys");
      else line("You have not heard enough yet. Look for the room that is not on the map.", "sys");
      return;
    }

    if (PLACE[key]) visit(PLACE[key]);

    var res = (state.ow && OW_RESPONSES[key]) || RESPONSES[key];
    if (!res) { line("Nothing answers.", "sys"); return; }

    if (res === "SIREN") {
      sirenPulse();
      line("A siren starts somewhere above the roofs. It does not stop for a long time.", "bad");
    } else if (res === "OWSIREN") {
      sirenPulse();
      line("The siren is not a siren. It is a voice reading a door number: three, one, two. It sounds wrong. Try it from the other end.", "bad");
    } else {
      line(res);
    }
  });

  /* ---------- restore progress this session ---------- */
  if (load("ow") === "1") { state.ow = true; applyOtherworld(false); }
  if (load("solved") === "1") state.solved = true;

  /* ---------- opening sequence ---------- */
  if (state.ow) {
    type("You came back.", "sys", function () {
      setTimeout(function () {
        type(state.solved ? "The door is open. Type 'leave'." : "The door numbers are still wrong.", "sys");
      }, 700);
    });
  } else {
    type("You came here on purpose.", "sys", function () {
      setTimeout(function () {
        type("Type a name, or a place. Type 'leave' when you have heard enough.", "sys", function () {
          setTimeout(function () {
            type("(Sound starts when you type. Headphones recommended.)", "sys");
          }, 600);
        });
      }, 700);
    });
  }

  input.focus();
})();
