(function () {
  "use strict";

  /* ================================================================
     CONFIG: the redirect destination is hard-coded and checked against
     an allowlist. It is never read from the URL (no open redirect).
     ================================================================ */
  var REDIRECT_URL = "https://en.wikipedia.org/wiki/Silent_Hill";
  var ALLOWED_HOSTS = ["en.wikipedia.org", "github.com", "www.konami.com"];
  var COUNTDOWN_SECONDS = 15;

  /* ---------- hidden clue for people who open the console ---------- */
  try {
    console.log(
      "%cRoom 312 is not on the map.%c\nSome doors are only reachable by address.",
      "color:#b8402f;font-family:monospace;font-size:14px",
      "color:#888;font-family:monospace"
    );
  } catch (e) {}

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
    "help": "Words the town knows: names, places, and the thing in your pocket. Some doors are only reachable by address."
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
  var log = $("log"), form = $("prompt"), input = $("input");
  var exitBox = $("exit"), exitLink = $("exit-link");
  var count = $("count"), destHost = $("dest-host"), cancel = $("cancel");
  var h1 = $("title"), meta = $("meta"), soundBtn = $("sound");
  var timer = null;

  var state = { ow: false, solved: false };
  function store(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  /* ================================================================
     AUDIO (generated in the browser, no files): radio static, a low
     drone, and a siren. Starts on the first keystroke or click.
     ================================================================ */
  var audio = { ctx: null, master: null, noiseGain: null, started: false, muted: false };

  function startAudio() {
    if (audio.started || audio.muted) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      var ctx = new AC();
      var master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      var len = ctx.sampleRate * 2;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      var band = ctx.createBiquadFilter();
      band.type = "bandpass"; band.frequency.value = 1800; band.Q.value = 0.7;
      var ng = ctx.createGain();
      ng.gain.value = 0.012;
      noise.connect(band); band.connect(ng); ng.connect(master);
      noise.start();

      var drone = ctx.createOscillator();
      drone.type = "sine"; drone.frequency.value = 55;
      var dg = ctx.createGain(); dg.gain.value = 0.05;
      drone.connect(dg); dg.connect(master); drone.start();

      master.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 3);

      audio.ctx = ctx; audio.master = master; audio.noiseGain = ng; audio.started = true;
      setInterval(staticBurst, 9000);
      updateSoundLabel();
    } catch (e) {}
  }

  function staticBurst() {
    if (!audio.started || audio.muted) return;
    var t = audio.ctx.currentTime, g = audio.noiseGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.012, t);
    g.linearRampToValueAtTime(0.09, t + 0.05);
    g.linearRampToValueAtTime(0.012, t + 0.5 + Math.random() * 0.8);
  }

  function playSiren() {
    if (!audio.started || audio.muted) return;
    var ctx = audio.ctx, t = ctx.currentTime;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(380, t);
    for (var i = 0; i < 2; i++) {
      osc.frequency.linearRampToValueAtTime(640, t + 1.2 + i * 2.4);
      osc.frequency.linearRampToValueAtTime(380, t + 2.4 + i * 2.4);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.8);
    g.gain.linearRampToValueAtTime(0, t + 4.8);
    osc.connect(g); g.connect(audio.master);
    osc.start(t); osc.stop(t + 5);
  }

  function updateSoundLabel() {
    soundBtn.textContent = (audio.started && !audio.muted) ? "sound: on" : "sound: off";
  }

  soundBtn.addEventListener("click", function () {
    if (!audio.started) { audio.muted = false; startAudio(); }
    else {
      audio.muted = !audio.muted;
      var t = audio.ctx.currentTime;
      audio.master.gain.cancelScheduledValues(t);
      audio.master.gain.linearRampToValueAtTime(audio.muted ? 0 : 0.4, t + 0.4);
    }
    updateSoundLabel();
    input.focus();
  });
  ["keydown", "pointerdown"].forEach(function (ev) {
    window.addEventListener(ev, function once() {
      startAudio();
      window.removeEventListener(ev, once);
    });
  });

  /* ---------- helpers ---------- */
  function line(html, cls) {
    var p = document.createElement("p");
    if (cls) p.className = cls;
    p.innerHTML = html;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }

  function type(text, cls, done) {
    var p = document.createElement("p");
    if (cls) p.className = cls;
    log.appendChild(p);
    var i = 0;
    (function tick() {
      p.textContent = text.slice(0, ++i);
      log.scrollTop = log.scrollHeight;
      if (i < text.length) setTimeout(tick, 28 + Math.random() * 30);
      else if (done) done();
    })();
  }

  /* ---------- Fog World ---------- */
  function applyOtherworld() {
    document.body.classList.add("otherworld");
    h1.textContent = "You never left...";
    h1.setAttribute("data-text", "You never left...");
    meta.innerHTML = "SILENT HILL, MAINE &mdash; THE OTHER SIDE";
    input.placeholder = "say something to the dark";
  }

  function enterOtherworld() {
    state.ow = true; store("ow", "1");
    applyOtherworld();
    document.body.classList.add("siren");
    setTimeout(function () { document.body.classList.remove("siren"); }, 5000);
    playSiren();
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

  /* ---------- command handling ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = input.value.trim();
    input.value = "";
    if (!raw) return;

    line("&gt; " + raw.replace(/[<>&]/g, ""), "you");
    var key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");

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

    var res = (state.ow && OW_RESPONSES[key]) || RESPONSES[key];
    if (!res) { line("Nothing answers.", "sys"); return; }

    if (res === "SIREN") {
      document.body.classList.add("siren");
      setTimeout(function () { document.body.classList.remove("siren"); }, 5000);
      playSiren();
      line("A siren starts somewhere above the roofs. It does not stop for a long time.", "bad");
    } else if (res === "OWSIREN") {
      document.body.classList.add("siren");
      setTimeout(function () { document.body.classList.remove("siren"); }, 5000);
      playSiren();
      line("The siren is not a siren. It is a voice reading a door number: three, one, two. It sounds wrong. Try it from the other end.", "bad");
    } else {
      line(res);
    }
  });

  /* ---------- restore progress this session ---------- */
  if (load("ow") === "1") { state.ow = true; applyOtherworld(); }
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
        type("Type a name, or a place. Type 'leave' when you have heard enough.", "sys");
      }, 700);
    });
  }

  input.focus();
})();
