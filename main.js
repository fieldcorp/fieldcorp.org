// field corp — interactions. Content comes from content/*.json.
(() => {
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // "rgb(1, 2, 3)" or "#010203" → [1, 2, 3]
  const rgb = (c) => c[0] === "#" ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : (c.match(/[\d.]+/g) || [115, 100, 85]).slice(0, 3).map(Number);
  const TZ = "America/Los_Angeles";
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- ticker ---------- */
  function setTicker(text) {
    const track = $(".ticker-track");
    track.parentElement.setAttribute("aria-label", text);
    track.textContent = Array(8).fill(text).join("  •  ") + "  •  ";
    track.textContent += track.textContent; // doubled so translateX(-50%) loops seamlessly
  }
  setTicker("To do the useful thing, to say the courageous thing, to contemplate the beautiful thing — T.S. Eliot");

  /* ---------- nav ---------- */
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", scrollY > innerHeight * 0.6);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  $("#yr").textContent = new Date().getFullYear();

  /* ---------- grass field (hero canvas) ---------- */
  // grass draws behind the wordmark; flowers draw on a second canvas in front of it
  const canvas = $(".grass");
  const ctx = canvas.getContext("2d");
  const bloomCanvas = $(".blooms");
  const fctx = bloomCanvas.getContext("2d");
  let W, H, blades, rows, stars, bend, flowers = [];
  const pointer = { x: -9999, y: -9999 };
  const HORIZON = 0.42; // at night the sky is above this line (as a share of the hero's height)
  let night = document.documentElement.dataset.theme === "night" ? 1 : 0; // 0 day … 1 night, eased during the fade

  let DPR = 1;
  function buildField() {
    const dpr = DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    for (const [cv, c2] of [[canvas, ctx], [bloomCanvas, fctx]]) {
      cv.width = W * dpr; cv.height = H * dpr;
      c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const gap = W < 600 ? 13 : 16;
    blades = []; rows = [];
    for (let y = gap; y < H + gap; y += gap) {
      rows.push({ y, start: blades.length });
      for (let x = (y / gap) % 2 ? gap / 2 : 0; x < W + gap; x += gap) {
        const depth = Math.pow(y / H, 1.6); // dots at the top, grass at the bottom
        blades.push({
          x: x + (Math.random() - 0.5) * gap * 0.5,
          y: y + (Math.random() - 0.5) * gap * 0.5,
          len: 1.5 + depth * (8 + Math.random() * 16),
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    bend = new Float32Array(blades.length);
    stars = [];
    const n = Math.max(60, Math.min(400, Math.round((W * H) / 5000)));
    for (let i = 0; i < n; i++) {
      const y = Math.pow(Math.random(), 1.4) * H * (HORIZON + 0.08); // thicker toward the top
      stars.push({ x: Math.random() * W, y, r: 0.4 + Math.random() * 0.9, phase: Math.random() * 6.28, speed: 0.0008 + Math.random() * 0.002 });
    }
  }

  // now and then a small ufo drifts into the sky, day or night; if anything's been planted,
  // it stops over a flower and beams it up. either way it leaves at light speed
  let ufo = null, nextUfo = 6000 + Math.random() * 10000;
  const BEAM = 2800, CHARGE = 550, ZIP = 260;
  function drawUfo(t, r, g, b) {
    if (!ufo) {
      if (t < nextUfo || !t) return;
      const target = flowers.length ? flowers[Math.floor(Math.random() * flowers.length)] : null;
      const ltr = target ? target.x > W / 2 : Math.random() < 0.5; // come in from the far side
      const stop = target ? target.x : W * (ltr ? 0.35 + Math.random() * 0.4 : 0.25 + Math.random() * 0.4);
      const approach = target ? 3500 : 4500 + Math.random() * 2500;
      ufo = {
        t0: t, ltr, target, stop, approach, s: 0.8 + Math.random() * 0.5,
        dur: approach + (target ? BEAM : 0) + CHARGE + ZIP,
        y: H * (0.07 + Math.random() * (HORIZON - 0.2)),
      };
    }
    const e = t - ufo.t0;
    if (e >= ufo.dur) { ufo = null; nextUfo = t + 15000 + Math.random() * 30000; return; }
    const s = ufo.s, f = ufo.target, dir = ufo.ltr ? 1 : -1;
    const from = ufo.ltr ? -40 * s : W + 40 * s;
    const beamEnd = ufo.approach + (f ? BEAM : 0), chargeEnd = beamEnd + CHARGE;
    let x = ufo.stop, beam = 0, zip = 0, charge = 0;
    if (e < ufo.approach) x = from + (ufo.stop - from) * ease(e / ufo.approach);
    else if (e < beamEnd) {
      const kb = (e - ufo.approach) / BEAM;
      beam = Math.min(1, kb * 5, (1 - kb) * 6);
      f.lift = ease(Math.min(1, Math.max(0, (kb - 0.15) / 0.7)));
    } else {
      if (f) { const i = flowers.indexOf(f); if (i >= 0) { flowers.splice(i, 1); stolen(f.c); } } // it's aboard
      if (e < chargeEnd) charge = (e - beamEnd) / CHARGE;
      else {
        zip = (e - chargeEnd) / ZIP;
        x = ufo.stop + dir * Math.pow(zip, 2) * (W + 200); // gone in a blink
      }
    }
    const still = beam || charge ? 0.3 : 1;
    const y = ufo.y + (Math.sin(e / 400) * 6 + Math.sin(e / 1500) * 14) * still; // a bit of a wobble
    ufo.at = { x, y };
    if (beam && f) {
      // the beam has no colour of its own: it bends the field behind it like heat haze
      const top = y + 3 * s, bottom = f.y + 4, wTop = 8 * s, wBot = 34;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - wTop, top); ctx.lineTo(x + wTop, top);
      ctx.lineTo(f.x + wBot, bottom); ctx.lineTo(f.x - wBot, bottom);
      ctx.closePath(); ctx.clip();
      const left = Math.min(x - wTop, f.x - wBot) - 8, width = Math.max(x + wTop, f.x + wBot) - left + 16;
      for (let yy = top; yy < bottom; yy += 2) {
        const off = Math.sin(yy * 0.09 - t * 0.012) * 6 * beam + Math.sin(yy * 0.023 + t * 0.004) * 3 * beam;
        ctx.drawImage(canvas, left * DPR, yy * DPR, width * DPR, 2 * DPR, left + off, yy, width, 2);
      }
      // and the faintest haze, brighter at the saucer
      const haze = ctx.createLinearGradient(0, top, 0, bottom);
      haze.addColorStop(0, `rgba(255,255,255,${(0.22 - 0.1 * night) * beam})`);
      haze.addColorStop(1, `rgba(255,255,255,${0.04 * beam})`);
      ctx.fillStyle = haze; ctx.fillRect(left, top, width, bottom - top);
      ctx.restore();
    }
    if (zip) {
      // light speed: a streak back to where it jumped from, and a pop of light there
      const streak = ctx.createLinearGradient(ufo.stop, 0, x, 0);
      streak.addColorStop(0, `rgba(${r},${g},${b},0)`);
      streak.addColorStop(1, `rgba(${r},${g},${b},${0.7 * (1 - zip * 0.5)})`);
      ctx.strokeStyle = streak; ctx.lineCap = "round";
      ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(ufo.stop, y); ctx.lineTo(x, y); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ufo.stop, y - 4 * s); ctx.lineTo(x, y - 4 * s); ctx.stroke();
      const pop = ctx.createRadialGradient(ufo.stop, y, 0, ufo.stop, y, 30 * s);
      pop.addColorStop(0, `rgba(255,255,255,${0.8 * (1 - zip)})`);
      pop.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = pop; ctx.beginPath(); ctx.arc(ufo.stop, y, 30 * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(x + (charge ? (Math.random() - 0.5) * 2 * charge : 0), y);
    // drifting: a gentle rock. charging: lean back. zipping: stretched thin along the way it's going
    ctx.rotate(charge || zip ? -0.18 * dir * Math.min(1, charge * 2 || 1) : Math.sin(e / 330 + 0.6) * 0.08 * dir);
    if (zip) ctx.scale(1 + 4 * zip, 1 - 0.5 * zip);
    drawSaucer(ctx, s, r, g, b, t, charge || zip, zip);
    ctx.restore();
  }

  // the saucer itself, drawn at the origin (the caller translates and turns it)
  function drawSaucer(c, s, r, g, b, t, racing, allLit) {
    c.fillStyle = `rgba(${r},${g},${b},.28)`; // glass dome
    c.strokeStyle = `rgb(${r},${g},${b})`; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(0, -3 * s, 7 * s, 7 * s, 0, Math.PI, 0); c.fill(); c.stroke();
    c.fillStyle = `rgb(${r},${g},${b})`; // saucer
    c.beginPath(); c.ellipse(0, 0, 18 * s, 4.5 * s, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = css("--accent"); // lights chasing along the rim, racing while it charges
    const lit = Math.floor(t / (racing ? 50 : 220)) % 4;
    for (let i = 0; i < 4; i++) {
      c.globalAlpha = i === lit || allLit ? 1 : 0.35;
      c.beginPath(); c.arc((i - 1.5) * 8 * s, 0.5 * s, 1.6 * s, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  }

  // sky behind the grass: a sunset glow while fading, then stars and moonlight from the corner
  function drawSky(t) {
    const glow = Math.sin(Math.PI * night); // peaks halfway through the fade
    if (glow > 0.01) {
      const g = ctx.createLinearGradient(0, 0, 0, H * (HORIZON + 0.25));
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.7, `rgba(233,135,90,${0.28 * glow})`);
      g.addColorStop(1, "rgba(233,135,90,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (night < 0.01) return;
    const sky = ctx.createLinearGradient(0, 0, 0, H * HORIZON);
    sky.addColorStop(0, `rgba(4,7,16,${0.75 * night})`);
    sky.addColorStop(1, "rgba(4,7,16,0)");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * HORIZON);

    const s = Math.pow(night, 1.6); // stars come out last
    ctx.fillStyle = "#f4f1e4";
    for (const st of stars) {
      ctx.globalAlpha = s * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.speed + st.phase)));
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.283); ctx.fill();
    }

    // moonlight glowing in from the top-right corner
    const gr = Math.max(W, H) * 0.75;
    ctx.globalAlpha = 1;
    const halo = ctx.createRadialGradient(W, 0, 0, W, 0, gr);
    halo.addColorStop(0, `rgba(236,232,210,${0.2 * night})`);
    halo.addColorStop(0.4, `rgba(236,232,210,${0.06 * night})`);
    halo.addColorStop(1, "rgba(236,232,210,0)");
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
  }

  function drawField(t) {
    ctx.clearRect(0, 0, W, H);
    drawSky(t);
    // the grass stops at a horizon; at night it's lit from the glowing corner's side
    const [r, g, b0] = rgb(css("--ink"));
    const lit = ctx.createLinearGradient(0, 0, W, 0);
    lit.addColorStop(0, `rgba(${r},${g},${b0},${1 - 0.55 * night})`);
    lit.addColorStop(1, `rgb(${r},${g},${b0})`);
    ctx.strokeStyle = lit;
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    const R = 120;
    for (let ri = 0; ri < rows.length; ri++) {
      const fadeSky = Math.min(1, Math.max(0, (rows[ri].y / H - HORIZON + 0.06) / 0.16));
      ctx.globalAlpha = 0.42 * fadeSky;
      ctx.beginPath();
      const end = ri + 1 < rows.length ? rows[ri + 1].start : blades.length;
      for (let i = rows[ri].start; i < end; i++) {
        const b = blades[i];
        const wind = Math.sin(t * 0.0011 + b.x * 0.008 + b.y * 0.003 + b.phase * 0.3) * 0.22;
        const dx = b.x - pointer.x, dy = b.y - pointer.y;
        const d = Math.hypot(dx, dy);
        const push = d < R ? Math.pow(1 - d / R, 2) * 1.3 * Math.sign(dx || 1) : 0;
        bend[i] += (wind + push - bend[i]) * 0.12;
        const a = -Math.PI / 2 + bend[i];
        const tx = b.x + Math.cos(a) * b.len, ty = b.y + Math.sin(a) * b.len;
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(b.x, b.y - b.len * 0.5, tx, ty);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    drawUfo(t, r, g, b0); // after the grass, so the beam can bend it

    // planted flowers
    fctx.clearRect(0, 0, W, H);
    fctx.lineWidth = 1.2;
    fctx.lineCap = "round";
    fctx.strokeStyle = css("--accent-2");
    for (const f of flowers) {
      f.g = Math.min(1, f.g + 0.03);
      if (f.lift && ufo?.at) {
        // being beamed up: rise toward the ufo, shrinking and turning
        fctx.save();
        fctx.translate(f.x + (ufo.at.x - f.x) * f.lift, f.y + (ufo.at.y + 6 - f.y) * f.lift);
        fctx.rotate(f.lift * 2.5);
        fctx.scale(1 - 0.75 * f.lift, 1 - 0.75 * f.lift);
        fctx.translate(-f.x, -f.y);
      }
      const sway = Math.sin(t * 0.002 + f.x * 0.05) * 0.12;
      const h = f.h * f.g;
      const hx = f.x + Math.sin(sway) * h, hy = f.y - Math.cos(sway) * h;
      fctx.beginPath(); fctx.moveTo(f.x, f.y); fctx.quadraticCurveTo(f.x, f.y - h * 0.6, hx, hy); fctx.stroke();
      fctx.fillStyle = f.c;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2 + t * 0.0004;
        fctx.beginPath();
        fctx.arc(hx + Math.cos(pa) * 4 * f.g, hy + Math.sin(pa) * 4 * f.g, 3.2 * f.g, 0, Math.PI * 2);
        fctx.fill();
      }
      fctx.fillStyle = "#e8d38c";
      fctx.beginPath(); fctx.arc(hx, hy, 2.4 * f.g, 0, Math.PI * 2); fctx.fill();
      if (f.lift && ufo?.at) fctx.restore();
    }
  }

  let running = true, raf;
  const loop = (t) => { drawField(t); if (running) raf = requestAnimationFrame(loop); };
  buildField();
  if (reduceMotion) drawField(0);
  else {
    raf = requestAnimationFrame(loop);
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    }).observe(canvas);
  }
  addEventListener("resize", () => { buildField(); if (reduceMotion) drawField(0); });

  // moving the mouse over the hero plants a trail of flowers; on touch, a tap plants one
  const hero = $(".hero");
  const FLOWER_GAP = 26, MAX_FLOWERS = 160;
  let lastPlant = null;
  function plant(x, y, c) {
    const colors = [css("--accent"), "#e8d38c", "#c98d7a", "#f3f3e6"];
    flowers.push({ x, y: y + 20, h: 18 + Math.random() * 14, g: 0, c: c || colors[Math.floor(Math.random() * colors.length)] });
    if (flowers.length > MAX_FLOWERS) flowers.shift();
    if (reduceMotion) { flowers.at(-1).g = 1; drawField(0); }
    lastPlant = { x, y };
  }
  const inSky = (y) => y < H * HORIZON; // flowers only grow below the horizon
  hero.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || e.target.closest("a, .conditions")) return;
    const r = canvas.getBoundingClientRect();
    if (!inSky(e.clientY - r.top)) plant(e.clientX - r.left, e.clientY - r.top);
  });
  hero.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    if (e.pointerType !== "mouse") return;
    if (inSky(pointer.y)) { lastPlant = null; return; } // start a fresh trail when they come back down
    if (!lastPlant) return plant(pointer.x, pointer.y);
    // fill in along the path so fast drags still leave an even trail
    let d = Math.hypot(pointer.x - lastPlant.x, pointer.y - lastPlant.y);
    while (d > FLOWER_GAP) {
      const k = FLOWER_GAP / d;
      const nx = lastPlant.x + (pointer.x - lastPlant.x) * k, ny = lastPlant.y + (pointer.y - lastPlant.y) * k;
      plant(nx, ny);
      flowers.at(-1).x += (Math.random() - 0.5) * 10; // jitter the drawn flower, not the trail
      d -= FLOWER_GAP;
    }
  });
  // 3s after load, one red flower appears somewhere in the field so people know they can plant
  setTimeout(() => {
    if (flowers.length) return; // they've already found it
    plant(W * (0.15 + Math.random() * 0.7), H * (HORIZON + 0.06 + Math.random() * (0.88 - HORIZON - 0.06)), "#b8322a");
    lastPlant = null; // don't join the first real trail to this flower
  }, 3000);
  // start a fresh trail on re-entry instead of joining it to where the mouse left
  hero.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; lastPlant = null; });

  /* ---------- day / sunset / night ---------- */
  // the palette fades day → sunset → night (and back through dawn); the hero sky follows `night`
  const root = document.documentElement;
  const toggle = $(".theme-toggle");
  const FADE = 1400; // per leg, matches --fade
  let theme = root.dataset.theme === "night" ? "night" : "day";
  let fadeTimer, tweenRaf;
  const ease = (k) => k * k * (3 - 2 * k);
  function tweenNight(to) {
    cancelAnimationFrame(tweenRaf);
    const from = night, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / (FADE * 2));
      night = from + (to - from) * ease(k);
      if (k < 1) tweenRaf = requestAnimationFrame(step);
    };
    tweenRaf = requestAnimationFrame(step);
  }
  function setTheme(to, animate = true) {
    if (to === theme) return;
    theme = to;
    clearTimeout(fadeTimer);
    toggle.setAttribute("aria-pressed", to === "night");
    const settle = () => { if (to === "night") root.dataset.theme = "night"; else delete root.dataset.theme; };
    if (!animate || reduceMotion) {
      settle(); night = to === "night" ? 1 : 0;
      if (reduceMotion) drawField(0);
    } else {
      root.dataset.theme = "dusk";
      fadeTimer = setTimeout(settle, FADE);
      tweenNight(to === "night" ? 1 : 0);
    }
    if (to === "night") scheduleShot(2500);
  }
  toggle.setAttribute("aria-pressed", theme === "night");
  toggle.addEventListener("click", () => {
    const to = theme === "night" ? "day" : "night";
    try { localStorage.setItem("field-theme", to); } catch (e) {}
    setTheme(to);
  });
  // follow the device's setting until someone picks with the toggle
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let picked = null;
    try { picked = localStorage.getItem("field-theme"); } catch (e) {}
    if (!picked) setTheme(e.matches ? "night" : "day");
  });

  // every so often at night a shooting star crosses the screen, left to right
  const sky = $(".shooting");
  const sctx = sky.getContext("2d");
  let shotTimer;
  function scheduleShot(delay = 8000 + Math.random() * 12000) {
    clearTimeout(shotTimer);
    if (reduceMotion) return;
    shotTimer = setTimeout(() => {
      if (theme === "night" && !document.hidden) shoot();
      if (theme === "night") scheduleShot();
    }, delay);
  }
  function shoot() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const vw = innerWidth, vh = innerHeight;
    sky.width = vw * dpr; sky.height = vh * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x0 = -vw * 0.05 + Math.random() * vw * 0.35, y0 = vh * (0.06 + Math.random() * 0.3);
    const ang = (6 + Math.random() * 14) * Math.PI / 180; // a slight fall
    const dist = vw * (0.55 + Math.random() * 0.35), tail = 110 + Math.random() * 110;
    const dur = 900 + Math.random() * 500, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const d = dist * (1 - Math.pow(1 - k, 2));
      const hx = x0 + Math.cos(ang) * d, hy = y0 + Math.sin(ang) * d;
      const tl = tail * Math.min(1, k * 3);
      const tx = hx - Math.cos(ang) * tl, ty = hy - Math.sin(ang) * tl;
      const a = Math.sin(Math.PI * k);
      sctx.clearRect(0, 0, vw, vh);
      const g = sctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, "rgba(244,241,228,0)");
      g.addColorStop(1, `rgba(244,241,228,${0.85 * a})`);
      sctx.strokeStyle = g; sctx.lineWidth = 1.6; sctx.lineCap = "round";
      sctx.beginPath(); sctx.moveTo(tx, ty); sctx.lineTo(hx, hy); sctx.stroke();
      const glow = sctx.createRadialGradient(hx, hy, 0, hx, hy, 6);
      glow.addColorStop(0, `rgba(255,252,238,${a})`);
      glow.addColorStop(1, "rgba(255,252,238,0)");
      sctx.fillStyle = glow; sctx.beginPath(); sctx.arc(hx, hy, 6, 0, 6.283); sctx.fill();
      if (k < 1) requestAnimationFrame(step);
      else sctx.clearRect(0, 0, vw, vh);
    };
    requestAnimationFrame(step);
  }
  if (theme === "night") scheduleShot(3000);

  /* ---------- the pile: where the ufo leaves what it takes ---------- */
  // flowers stolen from the field wait aboard; when the footer comes into view the ufo
  // zips in, lowers them onto the pile and zips off. each visitor's pile is kept in their browser
  const pileCanvas = $(".pile");
  const pctx = pileCanvas.getContext("2d");
  const PILE_SEED = 60, PILE_MAX = 160;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  let PW = 0, PH = 0, pile = [], aboard = store.get("field-aboard"), drop = null, pileRaf, pileOnScreen = false;
  const pileCx = () => PW * (PW < 600 ? 0.5 : 0.74);
  const ground = () => PH - 8;
  function stolen(c) {
    aboard.push(c); store.set("field-aboard", aboard);
    if (reduceMotion) deliverNow();
  }
  // the pile is a mound that grows with every flower; seed flowers fill it in, new ones land on top
  function landing(onTop) {
    const n = pile.length + 1, half = 40 + Math.sqrt(n) * 7, peak = 8 + Math.sqrt(n) * 6.5;
    const dx = Math.max(-0.95, Math.min(0.95, (Math.random() + Math.random() + Math.random() - 1.5) / 1.2)) * half;
    const h = peak * (1 - (dx / half) ** 2) * (onTop ? 1 : 0.5 + Math.random() * 0.5);
    return { x: pileCx() + dx, y: ground() - 3 - h, rot: Math.random() * 6.28, sc: 1.05 + Math.random() * 0.4 };
  }
  function buildPile() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    PW = pileCanvas.clientWidth; PH = pileCanvas.clientHeight;
    pileCanvas.width = PW * dpr; pileCanvas.height = PH * dpr;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = [...Array(PILE_SEED)].map((_, i) => ["#b5652f", "#e8d38c", "#c98d7a", "#f3f3e6", "#b8322a"][i % 5])
      .concat(store.get("field-pile")).slice(-PILE_MAX);
    pile = [];
    for (const c of colors) pile.push({ c, ...landing(pile.length >= PILE_SEED) });
  }
  function drawHead(c, x, y, sc, color, rot) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
    c.strokeStyle = css("--accent-2"); c.lineWidth = 1.2; c.lineCap = "round";
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(5, 6, 4, 14); c.stroke(); // a bit of stem
    c.fillStyle = color;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      c.beginPath(); c.arc(Math.cos(a) * 4, Math.sin(a) * 4, 3.2, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = "#e8d38c"; c.beginPath(); c.arc(0, 0, 2.4, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  const ZIP_IN = 260, SETTLE = 450, FALL = 750, GAP = 380, AFTER = 350, CHARGE_OUT = 500, ZIP_OUT = 260;
  function startDrop(t) {
    const cargo = aboard.splice(0); store.set("field-aboard", aboard);
    // landings are worked out one at a time so later flowers stack on earlier ones
    const items = cargo.map((c) => { const it = { c, ...landing(true), landed: false }; pile.push(it); return it; });
    const ltr = Math.random() < 0.5;
    const dropEnd = ZIP_IN + SETTLE + (items.length - 1) * GAP + FALL + AFTER;
    drop = { t0: t, ltr, items, dropEnd, end: dropEnd + CHARGE_OUT + ZIP_OUT, y: 34, s: 1 };
  }
  function deliverNow() {
    for (const c of aboard.splice(0)) pile.push({ c, ...landing(true) });
    store.set("field-aboard", aboard);
    savePile(); drawPile(0);
  }
  const savePile = () => store.set("field-pile", pile.slice(PILE_SEED).map((p) => p.c).slice(-(PILE_MAX - PILE_SEED)));

  function drawPile(t) {
    pctx.clearRect(0, 0, PW, PH);
    const [r, g, b] = rgb(css("--ink"));
    // a little ground under the pile
    pctx.strokeStyle = css("--line"); pctx.lineWidth = 1;
    const cx = pileCx();
    pctx.beginPath(); pctx.moveTo(cx - 160, ground() + 2); pctx.lineTo(cx + 160, ground() + 2); pctx.stroke();
    // back to front: the lowest flowers first, so the ones on top sit over them
    for (const p of pile.filter((p) => p.landed !== false).sort((a, b) => b.y - a.y)) drawHead(pctx, p.x, p.y, p.sc, p.c, p.rot);
    if (!drop) return;

    const d = drop, e = t - d.t0, s = d.s, dir = d.ltr ? 1 : -1;
    if (e >= d.end) { drop = null; savePile(); return; }
    let x = cx, zipK = 0, charge = 0;
    if (e < ZIP_IN) { zipK = 1 - e / ZIP_IN; x = cx - dir * Math.pow(zipK, 2) * (PW + 120); } // arriving at light speed
    else if (e > d.dropEnd + CHARGE_OUT) { zipK = (e - d.dropEnd - CHARGE_OUT) / ZIP_OUT; x = cx + dir * Math.pow(zipK, 2) * (PW + 120); }
    else if (e > d.dropEnd) charge = (e - d.dropEnd) / CHARGE_OUT;
    const y = d.y + Math.sin(e / 400) * 3;
    const beamOn = e > ZIP_IN + SETTLE * 0.4 && e < d.dropEnd;
    if (beamOn) {
      const k = Math.min(1, (e - ZIP_IN - SETTLE * 0.4) / 250, (d.dropEnd - e) / 250);
      const top = y + 3, bottom = ground() + 2, wTop = 8, wBot = 70;
      pctx.save();
      pctx.beginPath();
      pctx.moveTo(x - wTop, top); pctx.lineTo(x + wTop, top); pctx.lineTo(cx + wBot, bottom); pctx.lineTo(cx - wBot, bottom);
      pctx.closePath(); pctx.clip();
      const dpr = pileCanvas.width / PW, left = cx - wBot - 8, width = wBot * 2 + 16;
      for (let yy = top; yy < bottom; yy += 2) {
        const off = Math.sin(yy * 0.09 - t * 0.012) * 5 * k;
        pctx.drawImage(pileCanvas, left * dpr, yy * dpr, width * dpr, 2 * dpr, left + off, yy, width, 2);
      }
      const haze = pctx.createLinearGradient(0, top, 0, bottom);
      haze.addColorStop(0, `rgba(255,255,255,${(0.22 - 0.1 * night) * k})`);
      haze.addColorStop(1, `rgba(255,255,255,${0.04 * k})`);
      pctx.fillStyle = haze; pctx.fillRect(left, top, width, bottom - top);
      pctx.restore();
    }
    // flowers on their way down: out of the saucer, turning, growing, onto the pile
    d.items.forEach((it, i) => {
      const k = (e - ZIP_IN - SETTLE - i * GAP) / FALL;
      if (k < 0 || it.landed !== false) return;
      if (k >= 1) { it.landed = true; return; }
      const q = ease(k);
      drawHead(pctx, x + (it.x - x) * q, y + 8 + (it.y - y - 8) * q, it.sc * (0.3 + 0.7 * q), it.c, it.rot * q + (1 - q) * 3);
    });
    if (zipK && e >= ZIP_IN) {
      // the streak it leaves behind
      const streak = pctx.createLinearGradient(cx, 0, x, 0);
      streak.addColorStop(0, `rgba(${r},${g},${b},0)`);
      streak.addColorStop(1, `rgba(${r},${g},${b},${0.7 * (1 - zipK * 0.5)})`);
      pctx.strokeStyle = streak; pctx.lineWidth = 3; pctx.lineCap = "round";
      pctx.beginPath(); pctx.moveTo(cx, y); pctx.lineTo(x, y); pctx.stroke();
    }
    pctx.save();
    pctx.translate(x + (charge ? (Math.random() - 0.5) * 2 * charge : 0), y);
    pctx.rotate(zipK || charge ? -0.18 * dir : Math.sin(e / 330) * 0.06);
    if (zipK) pctx.scale(1 + 4 * zipK, 1 - 0.5 * zipK);
    drawSaucer(pctx, s, r, g, b, t, charge || zipK, zipK);
    pctx.restore();
  }
  const pileTick = (t) => {
    if (!drop && aboard.length && pileOnScreen) startDrop(t);
    drawPile(t);
    if (pileOnScreen) pileRaf = requestAnimationFrame(pileTick);
  };
  buildPile();
  if (reduceMotion) deliverNow();
  else {
    new IntersectionObserver(([e]) => {
      pileOnScreen = e.isIntersecting;
      cancelAnimationFrame(pileRaf);
      if (pileOnScreen) pileRaf = requestAnimationFrame(pileTick);
    }, { threshold: 0.6 }).observe(pileCanvas);
  }
  addEventListener("resize", () => { buildPile(); drawPile(0); });
  drawPile(0);

  /* ---------- field conditions (Berkeley) ---------- */
  const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: TZ });
  const tick = () => { $("#c-time").textContent = timeFmt.format(new Date()); };
  tick(); setInterval(tick, 1000);

  const WX = { 0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Light showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorm" };
  const hm = (iso) => iso.slice(11, 16);
  fetch("https://api.open-meteo.com/v1/forecast?latitude=37.8716&longitude=-122.2727&current=temperature_2m,weather_code,wind_speed_10m&daily=sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles&forecast_days=1")
    .then((r) => r.json())
    .then((d) => {
      const c = d.current;
      $("#c-wx").textContent = `${Math.round(c.temperature_2m)}°F · ${WX[c.weather_code] ?? "—"} · ${Math.round(c.wind_speed_10m)} mph`;
      $("#c-sun").textContent = `↑ ${hm(d.daily.sunrise[0])} · ↓ ${hm(d.daily.sunset[0])}`;
    })
    .catch(() => { $("#c-wx").textContent = "unavailable"; $("#c-sun").textContent = "—"; });

  /* ---------- content ---------- */
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const paras = (s = "") => s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  const slugify = (s = "") => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const pad = (n) => String(n).padStart(2, "0");
  const load = (name, fallback) =>
    fetch(`content/${name}.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .catch((err) => { console.error(`content/${name}.json failed to load`, err); return fallback; });

  // line drawings for the plots, picked with a branch's "drawing" field
  const DRAWINGS = {
    studio: `<circle class="sun" cx="150" cy="38" r="14"/><path class="ln" d="M10 118 Q 70 82 120 100 T 190 96"/><path class="ln house" d="M78 100 L78 78 L96 62 L114 78 L114 100"/><path class="ln" d="M90 100 v-12 h12 v12"/><path class="ln dash" d="M20 40 a 60 60 0 0 1 60 -20"/>`,
    table: `<path class="ln" d="M20 92 H180"/><path class="ln" d="M36 92 V118 M164 92 V118"/><g class="chairs"><path class="ln" d="M50 104 v-14 M70 104 v-14 M90 104 v-14 M110 104 v-14 M130 104 v-14 M150 104 v-14"/></g><path class="ln string" d="M10 30 Q 100 60 190 30"/><g class="bulbs"><circle cx="40" cy="40" r="3"/><circle cx="70" cy="47" r="3"/><circle cx="100" cy="49" r="3"/><circle cx="130" cy="47" r="3"/><circle cx="160" cy="40" r="3"/></g>`,
    hub: `<rect class="ln" x="66" y="14" width="68" height="112" rx="4"/><rect class="ln" x="74" y="22" width="40" height="70"/><path class="ln" d="M74 45 H114 M74 68 H114 M87 22 V92 M100 22 V92"/><rect class="ln" x="74" y="100" width="40" height="14"/><g class="keys"><circle cx="124" cy="30" r="2.5"/><circle cx="124" cy="40" r="2.5"/><circle cx="124" cy="50" r="2.5"/></g>`,
    craft: `<path class="ln" d="M60 110 L140 30"/><path class="ln" d="M130 26 l14 14 l-8 8 l-14 -14 z"/><path class="ln dash" d="M40 120 H160"/>`,
    post: `<rect class="ln" x="50" y="34" width="100" height="70"/><path class="ln" d="M50 34 L100 74 L150 34"/><rect class="ln dash" x="124" y="42" width="18" height="22"/>`,
    none: `<path class="ln dash" d="M100 40 V100 M70 70 H130"/>`,
  };
  const drawing = (name) => `<svg viewBox="0 0 200 140" aria-hidden="true">${DRAWINGS[name] || DRAWINGS.none}</svg>`;

  // Hub object icons, picked with an object's "icon" field (a photo replaces it)
  const ICONS = {
    cup: '<path class="ln" d="M10 14h18v14a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z M28 17h3a3 3 0 0 1 0 6h-3"/>',
    matches: '<rect class="ln" x="10" y="14" width="20" height="18" rx="2"/><path class="ln" d="M15 14V8 M20 14V6 M25 14V8"/>',
    seeds: '<path class="ln" d="M11 7h18v27H11z M11 12h18 M20 20c-4 0-4 7 0 7c4 0 4-7 0-7 M20 27v4"/>',
    knife: '<path class="ln" d="M7 27L27 11l4 3L13 30z M13 30l-5 3"/>',
    notebook: '<rect class="ln" x="11" y="7" width="18" height="26" rx="1"/><path class="ln" d="M15 7v26 M18 14h8 M18 18h8"/>',
    compass: '<circle class="ln" cx="20" cy="20" r="12"/><path class="ln" d="M20 11l3 9-3 9-3-9z"/>',
    candle: '<rect class="ln" x="15" y="17" width="10" height="17"/><path class="ln" d="M20 17v-4 M20 5c-3 3-2 7 0 7s3-4 0-7"/>',
    postcard: '<rect class="ln" x="6" y="11" width="28" height="19" rx="1"/><path class="ln" d="M20 13v15 M23 16h8 M23 20h8"/>',
    rope: '<circle class="ln" cx="19" cy="19" r="11"/><circle class="ln" cx="19" cy="19" r="5"/><path class="ln" d="M30 20c3 4 3 9 0 13"/>',
    box: '<rect class="ln" x="9" y="13" width="22" height="18" rx="1"/><path class="ln" d="M9 19h22 M20 13v6"/>',
  };
  const itemArt = (it) => it.photo
    ? `<img src="${esc(it.photo)}" alt="" loading="lazy">`
    : `<svg viewBox="0 0 40 40" aria-hidden="true">${ICONS[it.icon] || ICONS.box}</svg>`;

  const STATUS_CLASS = { growing: "status-active", sprouting: "status-soon", seed: "" };

  Promise.all([
    load("site", {}),
    load("branches", []),
    load("hub", []),
    load("timelapse", { photos: [] }),
  ]).then(([site, branches, hub, timelapse]) => {
    renderSite(site);
    branches = branches
      .filter((b) => b && b.name)
      .map((b) => ({ ...b, slug: slugify(b.slug || b.name), status: b.status || "seed", feature: b.feature || "none" }));
    renderBranches(branches, site);
    initLetter(site, branches);
    initPitch(site);
    startTypewriter(branches.map((b) => b.name));
    initDaylapse(timelapse);
    initSundial(timelapse);
    initTable();
    initVending(hub);
    initReveal();
  });

  function renderSite(site) {
    for (const el of $$("[data-site]")) {
      const v = site[el.dataset.site];
      if (v != null && v !== "") el.textContent = v;
    }
    if (site.quote) setTicker(`${site.quote} — ${site.quote_author || ""}`.replace(/ — $/, ""));
    const mail = $(".mail");
    if (site.email) { mail.href = `mailto:${site.email}`; mail.textContent = site.email; }
    else mail.hidden = true;
    const ways = (site.principles || []).filter((w) => w && w.title);
    $(".ways-list").innerHTML = ways.map((w) => `<li class="way"><h3>${esc(w.title)}</h3><p>${esc(w.text || "")}</p></li>`).join("");
    $("#ways").hidden = !ways.length;
  }

  function initPitch(site) {
    const flip = $(".flip");
    if (!flip) return;
    const form = $(".pitch", flip), note = $(".pitch-note", flip), front = $(".flip-front", flip);
    const turn = (open) => {
      flip.classList.toggle("flipped", open);
      front.inert = open; form.inert = !open;
      if (open) setTimeout(() => form.elements.idea.focus({ preventScroll: true }), 500);
    };
    turn(false);
    front.addEventListener("click", () => turn(true));
    front.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); turn(true); } });
    $(".flip-back-btn", form).addEventListener("click", () => { turn(false); front.focus({ preventScroll: true }); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = form.elements, idea = f.idea.value.trim(), name = f.name.value.trim(), from = f.email.value.trim();
      const missing = [f.idea, f.name].filter((el) => !el.value.trim());
      missing.forEach((el) => el.classList.add("missing"));
      if (missing.length) { missing[0].focus(); note.textContent = "tell us the idea and your name."; return; }
      if (!site.email) return;
      const body = `my experiment is ${idea}. i'm ${name}.` + (from ? ` reach me at ${from}.` : "");
      location.href = `mailto:${site.email}?subject=${encodeURIComponent(`a plot pitch from ${name}`)}&body=${encodeURIComponent(body)}`;
      note.textContent = `your email app should open with the pitch. if it doesn't, write to ${site.email}.`;
    });
    form.addEventListener("input", (e) => e.target.classList.remove("missing"));
  }

  // the contact note: blanks grow with what's typed; sending opens the visitor's own email app
  function initLetter(site, branches) {
    const form = $(".letter"), note = $(".letter-note");
    const branch = form.elements.branch;
    branch.innerHTML = ["field", ...branches.filter((b) => b.status !== "seed").map((b) => `field ${b.name}`)]
      .map((n) => `<option>${esc(n)}</option>`).join("");
    const fit = (el) => {
      const text = el.tagName === "SELECT" ? el.value : el.value || el.placeholder;
      el.style.width = `${text.length + (el.tagName === "SELECT" ? 3 : 1)}ch`;
    };
    for (const el of form.querySelectorAll("input, select")) {
      fit(el);
      el.addEventListener("input", () => { fit(el); el.classList.remove("missing"); });
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = form.elements, name = f.name.value.trim();
      if (!name) { f.name.classList.add("missing"); f.name.focus(); note.textContent = "start with your name."; return; }
      if (!site.email) return;
      const why = f.why.value.trim(), from = f.email.value.trim();
      const body = `hi, my name is ${name}. i'm curious about ${branch.value}` +
        (why ? ` because ${why}.` : ".") + (from ? ` you can reach me at ${from}.` : "");
      location.href = `mailto:${site.email}?subject=${encodeURIComponent(`hello from ${name} — ${branch.value}`)}&body=${encodeURIComponent(body)}`;
      note.textContent = `your email app should open with the note. if it doesn't, write to ${site.email}.`;
    });
  }

  function renderBranches(branches, site) {
    // plots: one scroll step each, after the intro
    const FURROWS = ["0deg", "90deg", "45deg", "-45deg"];
    const plots = branches.map((b, i) => `
      <div class="step"><a class="plot plot-${esc(b.drawing || "none")}" style="--furrow:${FURROWS[i % 4]}" href="#${b.status === "seed" ? "more" : esc(b.slug)}">
        <div class="plot-art${b.photo ? " has-photo" : ""}">${b.photo ? `<img class="plot-photo" src="${esc(b.photo)}" alt="" loading="lazy">` : drawing(b.drawing)}</div>
        <div class="plot-meta">
          <span class="plot-no">plot ${pad(i + 1)}</span>
          <h3>field ${esc(b.name)}</h3>
          <p>${esc(b.summary)}</p>
          <span class="status ${STATUS_CLASS[b.status] || ""}">${esc(b.status)}</span>
        </div>
      </a></div>`);
    // the open plot flips over to a form for pitching an experiment
    plots.push(`
      <div class="step"><div class="flip">
        <div class="flip-inner">
          <div class="flip-face flip-front plot plot-empty drawn" role="button" tabindex="0" aria-label="Pitch an experiment for the open plot">
            <div class="plot-art">${drawing("none")}</div>
            <div class="plot-meta">
              <span class="plot-no">plot ${pad(branches.length + 1)}</span>
              <h3>fallow</h3>
              <p>${esc(site.fallow_text || "this plot is open. got an experiment?")}</p>
              <span class="status">tap to pitch</span>
            </div>
          </div>
          <form class="flip-face flip-back pitch" novalidate>
            <span class="plot-no">plot ${pad(branches.length + 1)} — pitch an experiment</span>
            <p>
              my experiment is <input name="idea" placeholder="a few words about it" aria-label="Your experiment"><br>
              i'm <input name="name" placeholder="your name" autocomplete="name" aria-label="Your name"><br>
              reach me at <input name="email" type="email" placeholder="your email" autocomplete="email" aria-label="Your email">
            </p>
            <div class="pitch-actions">
              <button type="submit">send pitch →</button>
              <button type="button" class="flip-back-btn">← back</button>
            </div>
            <span class="pitch-note muted" aria-live="polite"></span>
          </form>
        </div>
      </div></div>`);
    $(".steps").insertAdjacentHTML("beforeend", plots.join(""));

    // full sections for growing / sprouting branches
    const used = new Set(); // each interactive feature appears once
    const wrap = $(".branches");
    branches.forEach((b, i) => {
      if (b.status === "seed") return;
      const sec = document.createElement("section");
      sec.className = "branch" + (wrap.children.length % 2 ? " branch-flip" : "");
      sec.id = b.slug;
      const link = b.link_label && b.link_url ? `<a class="cta" href="${esc(b.link_url)}">${esc(b.link_label)}</a>` : "";
      sec.innerHTML = `
        <div class="branch-copy">
          <span class="eyebrow">plot ${pad(i + 1)} — field ${esc(b.name)}</span>
          <h2>field ${esc(b.name)}</h2>
          ${paras(b.description)}
          ${link}
        </div>
        <div class="branch-art"></div>`;
      const art = $(".branch-art", sec);
      const tpl = $(`#feature-${b.feature}`);
      if (tpl && !used.has(b.feature)) {
        used.add(b.feature);
        const box = document.createElement("div");
        box.className = `feature feature-${b.feature}`;
        box.append(tpl.content.cloneNode(true));
        art.append(box);
        const next = $(".next-seating", box);
        if (next) next.textContent = b.next_seating || "tba";
      } else if (b.photo) {
        art.innerHTML = `<img class="branch-photo" src="${esc(b.photo)}" alt="" loading="lazy">`;
      } else {
        art.innerHTML = `<div class="branch-drawing plot-${esc(b.drawing || "none")}">${drawing(b.drawing)}</div>`;
      }
      wrap.append(sec);
    });

    // cards for branches still at seed
    const seeds = branches.filter((b) => b.status === "seed");
    $(".more-grid").innerHTML = seeds.map((b) => `
      <div class="more-card">
        <h3>field ${esc(b.name)}</h3>
        ${paras(b.description || b.summary)}
      </div>`).join("");
    $("#more").hidden = seeds.length === 0;
  }

  /* ---------- typewriter (words come from the branches) ---------- */
  function startTypewriter(WORDS) {
    if (!WORDS.length) return;
    const twEl = $(".tw-text");
    const CYCLE = 25000; // ms between word changes
    const TYPE = 85, DEL = 45, GAP = 400;
    // never leave the span empty: an empty span drops the baseline and makes "field" jump
    const show = (s) => { twEl.textContent = s || "​"; };
    show(WORDS[0]);
    if (reduceMotion || WORDS.length < 2) return;
    let w = 0, c = WORDS[0].length, state = "hold";
    const holdFor = (word) => Math.max(CYCLE - word.length * (TYPE + DEL) - GAP, 1000);
    const step = () => {
      const word = WORDS[w];
      if (state === "type") {
        if (c < word.length) { show(word.slice(0, ++c)); return setTimeout(step, TYPE); }
        state = "hold"; return setTimeout(step, holdFor(word));
      }
      if (state === "hold") { state = "del"; return setTimeout(step, DEL); }
      if (state === "del") {
        if (c > 0) { show(word.slice(0, --c)); return setTimeout(step, DEL); }
        state = "type"; w = (w + 1) % WORDS.length; return setTimeout(step, GAP);
      }
    };
    setTimeout(step, holdFor(WORDS[0]));
  }

  /* ---------- studio: time of day (photo timelapse, or the drawing until photos exist) ---------- */
  const nowParts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hour12: false, timeZone: TZ }).formatToParts(new Date());
  const NOW_H = (+nowParts.find((x) => x.type === "hour").value % 24) + +nowParts.find((x) => x.type === "minute").value / 60;
  const toHours = (s, d) => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ""); return m ? +m[1] + +m[2] / 60 : d; };
  const fmtHours = (h) => { const m = Math.round(h * 60); return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`; };

  // the field section: scrolling through the steps plays the day's timelapse
  function initDaylapse(tl) {
    const section = $("#field"), steps = $(".steps", section);
    const photos = (tl.photos || []).filter(Boolean);
    const stepEls = $$(".step", steps);
    // the step in focus is the one crossing this line; lower on phones, where the timelapse sits on top
    // phone or desktop framing; re-checked when the window crosses the breakpoint
    const phone = matchMedia("(max-width: 860px)");
    let narrow, FOCUS, io;
    function watchSteps() {
      narrow = phone.matches;
      FOCUS = narrow ? 0.72 : 0.5;
      io?.disconnect();
      io = new IntersectionObserver((entries) => {
        for (const e of entries) e.target.classList.toggle("on", e.isIntersecting);
      }, { rootMargin: `-${FOCUS * 100 - 5}% 0px -${95 - FOCUS * 100}% 0px` });
      stepEls.forEach((el) => io.observe(el));
    }
    watchSteps();
    phone.addEventListener("change", watchSteps);
    if (photos.length < 2) { section.classList.add("no-lapse"); stepEls.forEach((el) => el.classList.add("on")); return; }

    const t0 = toHours(tl.first_photo_time, 7), t1 = toHours(tl.last_photo_time, 18.5);
    const box = $(".daylapse", section);
    $(".daylapse-frames", box).innerHTML = photos
      .map((src, i) => `<img src="${esc(src)}" alt="" decoding="async"${i ? ' loading="lazy"' : ""}>`).join("");
    const frames = $$(".daylapse-frames img", box);
    const framesBox = $(".daylapse-frames", box);
    const time = $(".daylapse-time", box), bar = $(".daylapse-bar span", box);
    let shown = [0];
    // full screen when the section reaches the top, framed after ZOOM more of scrolling
    function frame() {
      const ZOOM = innerHeight * 0.6;
      const z = ease(Math.min(1, Math.max(0, -section.getBoundingClientRect().top / ZOOM)));
      const gutter = parseFloat(getComputedStyle(section).paddingLeft);
      let t, r, b, l = gutter;
      // on phones the frame is a band at the top, so slide the picture up to keep the horizon in it
      framesBox.style.transform = narrow ? `translateY(${-0.34 * innerHeight * z}px)` : "";
      if (narrow) { t = 84; b = innerHeight - t - innerHeight * 0.4; r = gutter; }
      else {
        t = 96; b = 32;
        r = innerWidth - (steps.getBoundingClientRect().left - parseFloat(getComputedStyle(section).columnGap));
      }
      const st = box.style;
      st.setProperty("--ct", `${t * z}px`); st.setProperty("--cr", `${r * z}px`);
      st.setProperty("--cb", `${b * z}px`); st.setProperty("--cl", `${l * z}px`);
      st.setProperty("--rad", `${6 * z}px`);
      steps.style.opacity = Math.max(0, (z - 0.6) / 0.4); // text arrives once the frame has nearly settled
    }
    // show the day at p (0 first photo … 1 last), blending between neighbouring photos
    function show(p, loop = false) {
      const n = frames.length, f = p * (loop ? n : n - 1);
      const i = Math.floor(f) % n, k = f - Math.floor(f);
      const next = loop ? (i + 1) % n : i + 1; // when looping, the last photo fades back into the first
      for (const j of shown) frames[j].style.opacity = 0;
      frames[i].style.opacity = 1;
      shown = [i];
      if (frames[next] && next !== i) { frames[next].style.opacity = k; shown.push(next); }
      const day = loop ? Math.min(1, f / (n - 1)) : p;
      time.textContent = fmtHours(t0 + day * (t1 - t0));
      bar.style.width = `${day * 100}%`;
    }

    // on the intro the day plays on its own, looping; once the plot cards arrive, scrolling sets the time
    // (each card gets its own part of the day) and the picture glides there
    const DAY_MS = 16000;
    const n = frames.length;
    let target = 0, auto = true, loop = 0, cur = 0, last = 0, raf, onScreen = false;
    const tick = (now) => {
      const dt = Math.min(now - (last || now), 100); last = now;
      if (auto) {
        loop = (loop + dt / DAY_MS) % 1;
        show(loop, true);
        cur = Math.min(1, (loop * n) / (n - 1));
      } else {
        cur += (target - cur) * (1 - Math.exp(-dt / 180));
        show(cur);
        loop = (cur * (n - 1)) / n; // so the loop picks up from here if they scroll back to the intro
      }
      if (onScreen) raf = requestAnimationFrame(tick);
    };
    if (!reduceMotion) {
      new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        cancelAnimationFrame(raf);
        if (onScreen) { last = 0; raf = requestAnimationFrame(tick); }
      }).observe(section);
    }

    function update() {
      frame();
      // 0 when the first step reaches the focus line, 1 when the last one does
      const first = stepEls[0].getBoundingClientRect(), lastStep = stepEls.at(-1).getBoundingClientRect();
      const mid = innerHeight * FOCUS;
      const a = first.top + first.height / 2, b = lastStep.top + lastStep.height / 2;
      const raw = (mid - a) / (b - a || 1);
      target = Math.min(1, Math.max(0, raw));
      auto = raw < 0.04; // still on the intro
      if (reduceMotion) show(target); // nothing plays on its own; scrolling moves through the day
    }
    let queued = false;
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
  }

  function initSundial(tl) {
    const root = $(".feature-sundial");
    if (!root) return;
    const range = $("#sun-range", root), out = $("#sun-out", root);
    const photos = (tl.photos || []).filter(Boolean);

    if (photos.length >= 2) {
      // real timelapse: photos are evenly spaced between the first and last photo times
      const t0 = toHours(tl.first_photo_time, 7), t1 = toHours(tl.last_photo_time, 18.5);
      const timeAt = (i) => t0 + (i * (t1 - t0)) / (photos.length - 1);
      $(".dial", root).remove();
      root.closest(".branch")?.classList.add("branch-bg"); // the photos become the section's background
      const box = $(".timelapse", root);
      box.hidden = false;
      $(".timelapse-frames", box).innerHTML = photos.map((src) => `<img src="${esc(src)}" alt="" decoding="async">`).join("");
      const frames = $$(".timelapse-frames img", box);
      range.min = 0; range.max = photos.length - 1; range.step = 1;
      const show = (i) => {
        frames.forEach((f, j) => f.classList.toggle("on", j === i));
        out.textContent = fmtHours(timeAt(i));
      };
      range.value = Math.round(Math.min(Math.max((NOW_H - t0) / (t1 - t0), 0), 1) * (photos.length - 1));
      range.addEventListener("input", () => show(+range.value));
      show(+range.value);
      return;
    }

    // illustration
    const sun = $("#sun", root), shadow = $("#shadow", root), dial = $(".dial", root);
    const START = 5, END = 21; // hours shown on the slider
    const mix = (a, b, k) => {
      const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16)), pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
      return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, "0")).join("");
    };
    function setSun(p) {
      const th = Math.PI * (1 - p);
      const sx = 200 + 160 * Math.cos(th), sy = 200 - 150 * Math.sin(th);
      sun.setAttribute("cx", sx.toFixed(1)); sun.setAttribute("cy", sy.toFixed(1));
      const elev = Math.max(Math.sin(th), 0.08);
      const len = Math.min(60 / Math.tan(elev * Math.PI / 2) * 0.6, 200);
      const dir = sx < 200 ? 1 : -1;
      const [a, b] = dir > 0 ? [170, 230] : [230, 170];
      shadow.setAttribute("points", `${a},196 ${b},196 ${b + dir * len},203 ${a + dir * len * 0.4},203`);
      const k = Math.sin(th);
      dial.style.setProperty("--sky-top", mix("e2b98f", "c7d3c4", k));
      dial.style.setProperty("--sky-bot", mix("f1dcc0", "eef0dc", k));
      out.textContent = fmtHours(START + p * (END - START));
    }
    range.value = Math.round(Math.min(Math.max((NOW_H - START) / (END - START), 0), 1) * 100);
    range.addEventListener("input", () => setSun(range.value / 100));
    setSun(range.value / 100);
  }

  /* ---------- table: seats + string lights ---------- */
  function initTable() {
    const root = $(".feature-table");
    if (!root) return;
    const lightsSvg = $(".lights", root), lightsPath = $(".lights path", root);
    const BULBS = 14, bulbs = [];
    for (let i = 1; i <= BULBS; i++) {
      const pt = lightsPath.getPointAtLength((lightsPath.getTotalLength() * i) / (BULBS + 1));
      const c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y + 6); c.setAttribute("r", 4.5);
      lightsSvg.appendChild(c); bulbs.push(c);
    }
    const seatNote = $(".seat-note", root);
    let taken = 0, n = 0;
    for (const row of $$(".seats", root)) {
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("button");
        s.className = "seat"; s.type = "button"; s.textContent = ++n;
        s.setAttribute("aria-pressed", "false"); s.setAttribute("aria-label", `seat ${n}`);
        s.addEventListener("click", () => {
          const on = s.getAttribute("aria-pressed") !== "true";
          s.setAttribute("aria-pressed", on);
          taken += on ? 1 : -1;
          bulbs.forEach((b, j) => b.classList.toggle("on", j < Math.round((taken / 16) * BULBS)));
          seatNote.textContent = taken === 0 ? "pick a seat."
            : taken === 1 ? `seat ${s.textContent} is yours (in spirit). join the list to make it real.`
            : `${taken} seats pulled up. that's a dinner.`;
        });
        row.appendChild(s);
      }
    }
  }

  /* ---------- hub: vending machine (up to 9 objects, codes A1–C3 by position) ---------- */
  function initVending(hub) {
    const root = $(".feature-vending");
    if (!root) return;
    const items = {};
    hub.filter((it) => it && it.name).slice(0, 9).forEach((it, i) => {
      items["ABC"[Math.floor(i / 3)] + ((i % 3) + 1)] = it;
    });
    const grid = $(".vend-grid", root), display = $(".vend-display", root), tray = $(".vend-tray", root);
    grid.innerHTML = Object.entries(items).map(([code, it]) =>
      `<div class="vend-slot" data-code="${code}" title="${esc(it.name)}">${itemArt(it)}<span class="code">${code}</span></div>`).join("");
    const letters = [...new Set(Object.keys(items).map((c) => c[0]))];
    const keys = $(".vend-keys", root);
    keys.innerHTML = [...letters, "1", "2", "3"].map((k) => `<button type="button" data-k="${k}">${k}</button>`).join("")
      + `<button type="button" class="wide" data-k="go">vend</button>`;
    let entry = "";
    keys.addEventListener("click", (e) => {
      const k = e.target.closest("button")?.dataset.k;
      if (!k) return;
      if (k === "go") return vend();
      if (/[ABC]/.test(k)) entry = k;
      else if (entry.length === 1) entry += k;
      display.textContent = entry || "select";
    });
    function vend() {
      const item = items[entry];
      if (!item) { display.textContent = "letter + number"; entry = ""; return; }
      const slot = $(`.vend-slot[data-code="${entry}"]`, root);
      display.textContent = `${entry} · vending…`;
      slot.classList.add("drop");
      setTimeout(() => {
        tray.innerHTML = `<div class="item">${itemArt(item)}${esc(item.name)}</div>`;
        display.textContent = "enjoy outside";
      }, 450);
      setTimeout(() => slot.classList.remove("drop"), 1600); // restock
      entry = "";
    }
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    const targets = $$(".section-head:not(.intro-card), .plot:not(.flip-front), .branch-copy, .branch-art, .more-card, .about > *, .way, .letter");
    targets.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        if (e.target.classList.contains("plot")) setTimeout(() => e.target.classList.add("drawn"), 150);
        io.unobserve(e.target);
      }
    }, { threshold: 0.15 });
    targets.forEach((el) => io.observe(el));
  }
})();
