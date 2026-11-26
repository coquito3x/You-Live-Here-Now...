(function () {
  "use strict";

  /* ================================================================
     CONFIG: edit this block only.
     The redirect destination is hard-coded here and checked against
     an allowlist. It is never read from the URL, so this page cannot
     be used as an open redirect.
     ================================================================ */
  var REDIRECT_URL = "https://en.wikipedia.org/wiki/Silent_Hill";
  var ALLOWED_HOSTS = ["en.wikipedia.org", "github.com", "www.konami.com"];
  var COUNTDOWN_SECONDS = 15;

  /* Words the town responds to. Keys are lowercase. */
  var RESPONSES = {
    "toluca": "Toluca Lake. The ferry stopped running a long time ago.",
    "lake": "Toluca Lake. The ferry stopped running a long time ago.",
    "brookhaven": "Brookhaven Hospital. Someone is still on the night shift.",
    "alchemilla": "Alchemilla Hospital. The lights are on. Nobody turned them on.",
    "midwich": "Midwich Elementary. Class is in session.",
    "rosewater": "Rosewater Park. The benches face the water. You should not sit.",
    "lakeview": "Lakeview Hotel. Room 312. The key is already in your pocket.",
    "312": "Lakeview Hotel. Room 312. The key is already in your pocket.",
    "alessa": "She is still burning. She is still waiting.",
    "cheryl": "You hear a child's voice, very far away. It might be calling someone else.",
    "harry": "He searched for a long time. You are not him.",
    "james": "A letter arrived. You have read it. You do not remember reading it.",
    "mary": "She is not here. Stop looking.",
    "radio": "<span class='bad'>kkkk...  kssshh... it is close. it is close.</span>",
    "siren": "SIREN",
    "fog": "FOG",
    "order": "The Order has never left. It only changed its name.",
    "claudia": "She says the town is a promise. She is not lying.",
    "otherworld": "Rust, and wire, and blood in the grate. You were already standing in it.",
    "help": "Words the town knows: names, places, and the thing in your pocket.",
    "exit": "LEAVE",
    "leave": "LEAVE"
  };

  var $ = function (id) { return document.getElementById(id); };
  var log = $("log"), form = $("prompt"), input = $("input");
  var exitBox = $("exit"), exitLink = $("exit-link");
  var count = $("count"), destHost = $("dest-host"), cancel = $("cancel");
  var timer = null;

  /* ---------- tiny helpers ---------- */
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
  var h1 = $("title");
  setInterval(function () {
    if (Math.random() < 0.35) {
      h1.classList.add("glitch");
      setTimeout(function () { h1.classList.remove("glitch"); }, 140);
    }
  }, 2600);

  /* ---------- command handling ---------- */
  var asked = 0;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = input.value.trim();
    input.value = "";
    if (!raw) return;

    line("&gt; " + raw.replace(/[<>&]/g, ""), "you");
    var key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    var res = RESPONSES[key];
    asked++;

    if (!res) {
      line("Nothing answers.", "sys");
      return;
    }
    if (res === "SIREN") {
      document.body.classList.add("siren");
      setTimeout(function () { document.body.classList.remove("siren"); }, 5000);
      line("A siren starts somewhere above the roofs. It does not stop for a long time.", "bad");
    } else if (res === "FOG") {
      line("You cannot see more than a few steps. You never could.", "sys");
    } else if (res === "LEAVE") {
      if (asked < 3) line("Not yet. Talk to the town first.", "sys");
      else { line("All right.", "sys"); showExit(); }
    } else {
      line(res);
    }
  });

  /* ---------- opening sequence ---------- */
  type("You came here on purpose.", "sys", function () {
    setTimeout(function () {
      type("Type a name, or a place. Type 'leave' when you have heard enough.", "sys");
    }, 700);
  });

  input.focus();
})();
