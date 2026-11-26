/* ====================================================================
   engine.js: visuals (WebGL fog + flashlight) and audio (Web Audio).
   Everything is generated in the browser; there are no image or sound
   files. Exposes window.SH for script.js and room312.html.
   ==================================================================== */
(function () {
  "use strict";

  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var $ = function (id) { return document.getElementById(id); };

  /* ==================================================================
     VISUALS
     ================================================================== */
  var fx = { ow: 0, owTarget: 0, flash: 0, draw: null };

  var VERT = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }";
  var FRAG = [
    "precision mediump float;",
    "uniform vec2 r; uniform float t; uniform vec2 m; uniform float ow; uniform float fl;",
    "float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }",
    "float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);",
    "  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }",
    "float fbm(vec2 p){ float v = 0., a = .5; for(int i = 0; i < 5; i++){ v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / r; float asp = r.x / r.y; vec2 p = vec2(uv.x * asp, uv.y);",
    "  float q = fbm(p * 2.0 + vec2(t * .015, -t * .010));",
    "  float f = fbm(p * 2.6 + q * 1.8 + vec2(-t * .020, t * .012));",
    "  vec3 dark = mix(vec3(.035, .040, .045), vec3(.060, .018, .012), ow);",
    "  vec3 lite = mix(vec3(.46, .47, .45), vec3(.62, .22, .12), ow);",
    "  vec3 col = mix(dark, lite, smoothstep(.30, .85, f) * .55);",
    "  vec2 mp = vec2(m.x * asp, m.y);",
    "  float d = distance(p, mp);",
    "  float rad = .62 + .04 * sin(t * 1.6) + .02 * sin(t * 7.3);",
    "  float light = pow(smoothstep(rad, 0., d), 1.4);",
    "  col *= mix(.55, .28, ow) + 1.15 * light;",
    "  vec2 g = abs(fract(p * 14.) - .5);",
    "  float grate = smoothstep(.43, .5, max(g.x, g.y));",
    "  col = mix(col, col * (1. - .65 * grate), ow * .7);",
    "  float rust = smoothstep(.55, .9, fbm(p * 9.));",
    "  col = mix(col, vec3(.35, .12, .05) * (.3 + light), ow * rust * .5);",
    "  col += fl * vec3(.35, .04, .02) * (.5 + light);",
    "  float v = smoothstep(1.25, .25, distance(uv, vec2(.5)));",
    "  col *= mix(.45, 1., v);",
    "  gl_FragColor = vec4(col, 1.);",
    "}"
  ].join("\n");

  function initFx() {
    var cv = $("fx");
    if (!cv) return;
    var gl = null;
    try { gl = cv.getContext("webgl", { antialias: false, alpha: false }); } catch (e) {}
    if (!gl) { document.body.classList.add("nogl"); return; }

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    } catch (e) { document.body.classList.add("nogl"); return; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ["r", "t", "m", "ow", "fl"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });

    function size() {
      var s = 0.5; /* half resolution: soft like fog and cheap to render */
      cv.width = Math.max(2, Math.floor(window.innerWidth * s));
      cv.height = Math.max(2, Math.floor(window.innerHeight * s));
      gl.viewport(0, 0, cv.width, cv.height);
    }
    size();
    window.addEventListener("resize", function () { size(); if (reduce) draw(); });

    var t0 = performance.now(), last = -1e9;
    var ptr = [0.5, 0.55], cur = [0.5, 0.55];
    window.addEventListener("pointermove", function (e) {
      ptr = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
      last = performance.now();
    });

    function draw(now) {
      var t = reduce ? 40 : ((now || performance.now()) - t0) / 1000;
      var drift = [0.5 + 0.28 * Math.sin(t * 0.23), 0.55 + 0.18 * Math.sin(t * 0.31 + 1)];
      var tgt = ((now || performance.now()) - last < 4000) ? ptr : drift;
      cur[0] += (tgt[0] - cur[0]) * 0.08;
      cur[1] += (tgt[1] - cur[1]) * 0.08;
      fx.ow += (fx.owTarget - fx.ow) * (reduce ? 1 : 0.025);
      fx.flash *= 0.93;
      gl.uniform2f(U.r, cv.width, cv.height);
      gl.uniform1f(U.t, t);
      gl.uniform2f(U.m, cur[0], cur[1]);
      gl.uniform1f(U.ow, fx.ow);
      gl.uniform1f(U.fl, fx.flash);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    fx.draw = draw;

    if (reduce) draw();
    else (function loop(now) { draw(now); requestAnimationFrame(loop); })(performance.now());
  }

  fx.setOw = function (v) { fx.owTarget = v; if (reduce && fx.draw) { fx.ow = v; fx.draw(); } };
  fx.pulse = function () { fx.flash = 1; if (reduce && fx.draw) fx.draw(); };

  /* ==================================================================
     AUDIO
     Layers: wind, a detuned sub drone, a dissonant pad (Fog World),
     faint radio static with bursts, rain (room 312), distant metallic
     clanks through a reverb, plus keyboard ticks, a siren and stingers.
     ================================================================== */
  var A = { ctx: null, started: false, muted: false, level: 0, rain: false, sbase: 0.004, onBurst: null };

  function impulse(c, sec, decay) {
    var len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  function noiseBuf(c, sec) {
    var len = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function loopNoise(c) {
    var s = c.createBufferSource();
    s.buffer = A.nb; s.loop = true;
    s.start(0, Math.random() * 2);
    return s;
  }
  function osc(c, type, freq, dest) {
    var o = c.createOscillator();
    o.type = type; o.frequency.value = freq;
    o.connect(dest); o.start();
    return o;
  }

  function startAudio() {
    if (A.started || A.muted) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      var c = new AC();
      if (c.resume) c.resume();
      A.ctx = c;

      var master = c.createGain(); master.gain.value = 0;
      var comp = c.createDynamicsCompressor();
      comp.threshold.value = -20; comp.ratio.value = 4;
      master.connect(comp); comp.connect(c.destination);

      var bus = c.createGain(); bus.connect(master);
      var rev = c.createConvolver(); rev.buffer = impulse(c, 3.4, 2.4);
      var wet = c.createGain(); wet.gain.value = 0.55;
      bus.connect(rev); rev.connect(wet); wet.connect(master);

      A.master = master; A.bus = bus; A.nb = noiseBuf(c, 3);

      /* wind: band-passed noise, filter and level drift slowly */
      var wf = c.createBiquadFilter(); wf.type = "bandpass"; wf.frequency.value = 420; wf.Q.value = 0.9;
      var wg = c.createGain(); wg.gain.value = 0.05;
      loopNoise(c).connect(wf); wf.connect(wg); wg.connect(bus);
      var l1 = c.createOscillator(); l1.frequency.value = 0.07;
      var l1g = c.createGain(); l1g.gain.value = 260;
      l1.connect(l1g); l1g.connect(wf.frequency); l1.start();
      var l2 = c.createOscillator(); l2.frequency.value = 0.05;
      var l2g = c.createGain(); l2g.gain.value = 0.03;
      l2.connect(l2g); l2g.connect(wg.gain); l2.start();

      /* drone: slightly detuned low saws + triangle, slow filter sweep */
      var df = c.createBiquadFilter(); df.type = "lowpass"; df.frequency.value = 150; df.Q.value = 4;
      var dg = c.createGain(); dg.gain.value = 0.07;
      osc(c, "sawtooth", 41.2, df); osc(c, "sawtooth", 41.9, df); osc(c, "triangle", 82.6, df);
      df.connect(dg); dg.connect(bus);
      var l3 = c.createOscillator(); l3.frequency.value = 0.04;
      var l3g = c.createGain(); l3g.gain.value = 60;
      l3.connect(l3g); l3g.connect(df.frequency); l3.start();

      /* pad: a tritone cluster that fades in for Fog World */
      var pg = c.createGain(); pg.gain.value = 0; pg.connect(bus);
      [110, 155.56, 233].forEach(function (f) {
        var o = osc(c, "sine", f, pg);
        o.detune.value = Math.random() * 14 - 7;
      });

      /* radio static: dry, quiet, with periodic bursts */
      var sh = c.createBiquadFilter(); sh.type = "highpass"; sh.frequency.value = 1800;
      var sb = c.createBiquadFilter(); sb.type = "bandpass"; sb.frequency.value = 3200; sb.Q.value = 0.5;
      var sg = c.createGain(); sg.gain.value = A.sbase;
      loopNoise(c).connect(sh); sh.connect(sb); sb.connect(sg); sg.connect(master);

      /* rain (switched on by room312.html) */
      var rf = c.createBiquadFilter(); rf.type = "highpass"; rf.frequency.value = 2600;
      var rg = c.createGain(); rg.gain.value = 0;
      loopNoise(c).connect(rf); rf.connect(rg); rg.connect(bus);

      A.df = df; A.dg = dg; A.pg = pg; A.sg = sg; A.rg = rg;
      master.gain.linearRampToValueAtTime(0.55, c.currentTime + 4);
      A.started = true;

      setLevel(A.level);
      setRain(A.rain);
      scheduleBurst();
      scheduleClank();
      updateLabel();
    } catch (e) {}
  }

  function scheduleBurst() {
    setTimeout(function () {
      if (A.started && !A.muted) {
        var g = A.sg.gain, t = A.ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(A.sbase, t);
        g.linearRampToValueAtTime(0.07, t + 0.04);
        g.linearRampToValueAtTime(A.sbase, t + 0.5 + Math.random() * 0.8);
        if (SH.onBurst) SH.onBurst();
      }
      scheduleBurst();
    }, 6500 + Math.random() * 8000);
  }

  function scheduleClank() {
    var base = A.level > 0.5 ? 3500 : 9000;
    setTimeout(function () { clank(); scheduleClank(); }, base + Math.random() * base);
  }

  /* a distant metallic hit: a noise burst rung through two resonant filters */
  function clank() {
    if (!A.started || A.muted) return;
    var c = A.ctx, t = c.currentTime;
    var src = c.createBufferSource(); src.buffer = A.nb;
    var f = 500 + Math.random() * 1800;
    var out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    [f, f * 2.76].forEach(function (fr) {
      var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fr; bp.Q.value = 40;
      src.connect(bp); bp.connect(out);
    });
    var pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 2 - 1; out.connect(pan); pan.connect(A.bus); }
    else out.connect(A.bus);
    src.start(t, Math.random() * 2); src.stop(t + 0.09);
  }

  function setLevel(l) {
    A.level = l;
    if (!A.started) return;
    var t = A.ctx.currentTime;
    A.df.frequency.setTargetAtTime(150 - l * 50, t, 2);
    A.dg.gain.setTargetAtTime(0.07 + l * 0.05, t, 2);
    A.pg.gain.setTargetAtTime(l * 0.045, t, 2.5);
    A.sbase = 0.004 + l * 0.01;
    A.sg.gain.setTargetAtTime(A.sbase, t, 1.5);
  }

  function setRain(on) {
    A.rain = on;
    if (!A.started) return;
    A.rg.gain.setTargetAtTime(on ? 0.03 : 0, A.ctx.currentTime, 1.2);
  }

  function tvBoost(on) {
    if (!A.started) return;
    A.sg.gain.setTargetAtTime(on ? 0.05 : A.sbase, A.ctx.currentTime, 0.15);
  }

  /* ---- one-shot sounds ---- */
  function ready() { return A.started && !A.muted; }

  function tick() {
    if (!ready()) return;
    var c = A.ctx, t = c.currentTime;
    var s = c.createBufferSource(); s.buffer = A.nb;
    var bp = c.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 900 + Math.random() * 500; bp.Q.value = 1.2;
    var g = c.createGain();
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(bp); bp.connect(g); g.connect(A.master);
    s.start(t, Math.random() * 2); s.stop(t + 0.06);
  }

  function blip() {
    if (!ready()) return;
    var c = A.ctx, t = c.currentTime;
    var o = c.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(85, t + 0.25);
    var g = c.createGain();
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + 0.32);
  }

  function siren() {
    if (!ready()) return;
    var c = A.ctx, t = c.currentTime;
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 760;
    var g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 1.2);
    g.gain.setValueAtTime(0.09, t + 5);
    g.gain.linearRampToValueAtTime(0, t + 7);
    lp.connect(g); g.connect(A.bus);
    [0, 8].forEach(function (det) {
      var o = c.createOscillator(); o.type = "sawtooth"; o.detune.value = det;
      o.frequency.setValueAtTime(230, t);
      for (var i = 0; i < 2; i++) {
        o.frequency.linearRampToValueAtTime(460, t + 1.4 + i * 2.8);
        o.frequency.linearRampToValueAtTime(230, t + 2.8 + i * 2.8);
      }
      o.connect(lp); o.start(t); o.stop(t + 7.2);
    });
  }

  /* entering Fog World: sub boom plus a rising swell */
  function boom() {
    if (!ready()) return;
    var c = A.ctx, t = c.currentTime;
    var o = c.createOscillator(); o.type = "sine"; o.frequency.value = 38;
    var og = c.createGain();
    og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(og); og.connect(A.bus); o.start(t); o.stop(t + 3.3);

    var s = c.createBufferSource(); s.buffer = A.nb; s.loop = true;
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 3;
    lp.frequency.setValueAtTime(200, t); lp.frequency.exponentialRampToValueAtTime(4200, t + 2.4);
    var sg = c.createGain();
    sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.2, t + 2.2); sg.gain.linearRampToValueAtTime(0, t + 2.8);
    s.connect(lp); lp.connect(sg); sg.connect(A.bus); s.start(t); s.stop(t + 3);
  }

  /* the door in the Fog World opening: a long creak and a thud */
  function door() {
    if (!ready()) return;
    var c = A.ctx, t = c.currentTime;
    var o = c.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(300, t);
    o.frequency.linearRampToValueAtTime(520, t + 0.7);
    o.frequency.linearRampToValueAtTime(280, t + 1.5);
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 6;
    var g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.2); g.gain.linearRampToValueAtTime(0, t + 1.6);
    o.connect(lp); lp.connect(g); g.connect(A.bus); o.start(t); o.stop(t + 1.7);
    var th = c.createOscillator(); th.type = "sine"; th.frequency.value = 55;
    var tg = c.createGain();
    tg.gain.setValueAtTime(0, t + 1.5); tg.gain.linearRampToValueAtTime(0.4, t + 1.52);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    th.connect(tg); tg.connect(A.bus); th.start(t + 1.5); th.stop(t + 2.7);
  }

  /* ---------- sound button, radio light, autostart ---------- */
  function updateLabel() {
    var b = $("sound");
    if (!b) return;
    b.textContent = (A.started && !A.muted) ? "SOUND ON" : "SOUND OFF";
    b.setAttribute("aria-pressed", (A.started && !A.muted) ? "true" : "false");
  }

  function toggle() {
    if (!A.started) { A.muted = false; startAudio(); }
    else {
      A.muted = !A.muted;
      var t = A.ctx.currentTime;
      A.master.gain.cancelScheduledValues(t);
      A.master.gain.setValueAtTime(A.master.gain.value, t);
      A.master.gain.linearRampToValueAtTime(A.muted ? 0 : 0.55, t + 0.4);
    }
    updateLabel();
  }

  function wake(e) {
    if (e && e.target && e.target.closest && e.target.closest("#sound")) return;
    startAudio();
  }

  var SH = window.SH = {
    reduced: reduce,
    fx: fx,
    onBurst: null,
    audio: {
      tick: tick, blip: blip, siren: siren, boom: boom, door: door,
      setLevel: setLevel, setRain: setRain, tvBoost: tvBoost
    }
  };

  function boot() {
    initFx();
    var b = $("sound");
    if (b) b.addEventListener("click", toggle);
    updateLabel();
    ["keydown", "pointerdown", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, wake, { once: true });
    });
    var radio = $("radio");
    SH.onBurst = function () {
      if (!radio) return;
      radio.classList.add("live");
      setTimeout(function () { radio.classList.remove("live"); }, 700);
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
