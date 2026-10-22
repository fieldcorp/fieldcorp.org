// field corp — interactions. No build step, no dependencies.
(() => {
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const TZ = "America/Los_Angeles";
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- ticker ---------- */
  const QUOTE = "To do the useful thing, to say the courageous thing, to contemplate the beautiful thing — T.S. Eliot";
  const track = $(".ticker-track");
  track.textContent = Array(8).fill(QUOTE).join("  •  ") + "  •  ";
  track.textContent += track.textContent; // doubled so translateX(-50%) loops seamlessly

  /* ---------- nav ---------- */
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", scrollY > innerHeight * 0.6);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  $("#yr").textContent = new Date().getFullYear();

  /* ---------- typewriter (words come from the plots) ---------- */
  const WORDS = $$(".plot[data-branch]").map((p) => p.dataset.branch).filter(Boolean);
  const twEl = $(".tw-text");
  if (!reduceMotion) {
    let w = 0, c = WORDS[0].length, state = "hold";
    const step = () => {
      const word = WORDS[w];
      if (state === "type") {
        if (c < word.length) { twEl.textContent = word.slice(0, ++c); return setTimeout(step, 85); }
        state = "hold"; return setTimeout(step, 1800);
      }
      if (state === "hold") { state = "del"; return setTimeout(step, 45); }
      if (state === "del") {
        if (c > 0) { twEl.textContent = word.slice(0, --c); return setTimeout(step, 45); }
        state = "type"; w = (w + 1) % WORDS.length; return setTimeout(step, 400);
      }
    };
    setTimeout(step, 1800);
  }

  /* ---------- grass field (hero canvas) ---------- */
  const canvas = $(".grass");
  const ctx = canvas.getContext("2d");
  let W, H, blades, bend, flowers = [];
  const pointer = { x: -9999, y: -9999 };

  function buildField() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gap = W < 600 ? 13 : 16;
    blades = [];
    for (let y = gap; y < H + gap; y += gap) {
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
  }

  function drawField(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = css("--ink");
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    const R = 120;
    for (let i = 0; i < blades.length; i++) {
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

    // planted flowers
    ctx.globalAlpha = 1;
    for (const f of flowers) {
      f.g = Math.min(1, f.g + 0.03);
      const sway = Math.sin(t * 0.002 + f.x * 0.05) * 0.12;
      const h = f.h * f.g;
      const hx = f.x + Math.sin(sway) * h, hy = f.y - Math.cos(sway) * h;
      ctx.strokeStyle = css("--accent-2");
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x, f.y - h * 0.6, hx, hy); ctx.stroke();
      ctx.fillStyle = f.c;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2 + t * 0.0004;
        ctx.beginPath();
        ctx.arc(hx + Math.cos(pa) * 4 * f.g, hy + Math.sin(pa) * 4 * f.g, 3.2 * f.g, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#e8d38c";
      ctx.beginPath(); ctx.arc(hx, hy, 2.4 * f.g, 0, Math.PI * 2); ctx.fill();
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
  function plant(x, y) {
    const colors = [css("--accent"), "#e8d38c", "#c98d7a", "#f3f3e6"];
    flowers.push({ x, y: y + 20, h: 18 + Math.random() * 14, g: 0, c: colors[Math.floor(Math.random() * colors.length)] });
    if (flowers.length > MAX_FLOWERS) flowers.shift();
    if (reduceMotion) { flowers.at(-1).g = 1; drawField(0); }
    lastPlant = { x, y };
  }
  hero.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || e.target.closest("a, .conditions")) return;
    const r = canvas.getBoundingClientRect();
    plant(e.clientX - r.left, e.clientY - r.top);
  });
  hero.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    if (e.pointerType !== "mouse") return;
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
  // start a fresh trail on re-entry instead of joining it to where the mouse left
  hero.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; lastPlant = null; });

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

  /* ---------- studio: sun dial over wayhome ---------- */
  const range = $("#sun-range"), out = $("#sun-out"), sun = $("#sun"), shadow = $("#shadow"), dial = $(".dial");
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
    const hrs = START + p * (END - START);
    out.textContent = `${String(Math.floor(hrs)).padStart(2, "0")}:${String(Math.round((hrs % 1) * 60) % 60).padStart(2, "0")}`;
  }
  const nowParts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hour12: false, timeZone: TZ }).formatToParts(new Date());
  const nowH = +nowParts.find((x) => x.type === "hour").value + +nowParts.find((x) => x.type === "minute").value / 60;
  range.value = Math.round(Math.min(Math.max((nowH - START) / (END - START), 0), 1) * 100);
  range.addEventListener("input", () => setSun(range.value / 100));
  setSun(range.value / 100);

  /* ---------- table: seats + string lights ---------- */
  const lightsSvg = $(".lights"), lightsPath = $(".lights path");
  const BULBS = 14, bulbs = [];
  for (let i = 1; i <= BULBS; i++) {
    const pt = lightsPath.getPointAtLength((lightsPath.getTotalLength() * i) / (BULBS + 1));
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y + 6); c.setAttribute("r", 4.5);
    lightsSvg.appendChild(c); bulbs.push(c);
  }
  const seatNote = $("#seat-note");
  let taken = 0, n = 0;
  for (const row of $$(".seats")) {
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

  /* ---------- hub: vending machine ---------- */
  // Placeholder inventory — swap names/icons for the real objects.
  const ITEMS = {
    A1: ["enamel cup", '<path class="ln" d="M10 14h18v14a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z M28 17h3a3 3 0 0 1 0 6h-3"/>'],
    A2: ["matches", '<rect class="ln" x="10" y="14" width="20" height="18" rx="2"/><path class="ln" d="M15 14V8 M20 14V6 M25 14V8"/>'],
    A3: ["seed packet", '<path class="ln" d="M11 7h18v27H11z M11 12h18 M20 20c-4 0-4 7 0 7c4 0 4-7 0-7 M20 27v4"/>'],
    B1: ["pocket knife", '<path class="ln" d="M7 27L27 11l4 3L13 30z M13 30l-5 3"/>'],
    B2: ["field notebook", '<rect class="ln" x="11" y="7" width="18" height="26" rx="1"/><path class="ln" d="M15 7v26 M18 14h8 M18 18h8"/>'],
    B3: ["compass", '<circle class="ln" cx="20" cy="20" r="12"/><path class="ln" d="M20 11l3 9-3 9-3-9z"/>'],
    C1: ["candle", '<rect class="ln" x="15" y="17" width="10" height="17"/><path class="ln" d="M20 17v-4 M20 5c-3 3-2 7 0 7s3-4 0-7"/>'],
    C2: ["postcard", '<rect class="ln" x="6" y="11" width="28" height="19" rx="1"/><path class="ln" d="M20 13v15 M23 16h8 M23 20h8"/>'],
    C3: ["rope", '<circle class="ln" cx="19" cy="19" r="11"/><circle class="ln" cx="19" cy="19" r="5"/><path class="ln" d="M30 20c3 4 3 9 0 13"/>'],
  };
  const grid = $(".vend-grid"), display = $(".vend-display"), tray = $(".vend-tray");
  const icon = (svg) => `<svg viewBox="0 0 40 40" aria-hidden="true">${svg}</svg>`;
  for (const [code, [name, svg]] of Object.entries(ITEMS)) {
    grid.insertAdjacentHTML("beforeend", `<div class="vend-slot" data-code="${code}" title="${name}">${icon(svg)}<span class="code">${code}</span></div>`);
  }
  let entry = "";
  const keys = $(".vend-keys");
  for (const k of ["A", "B", "C", "1", "2", "3"]) keys.insertAdjacentHTML("beforeend", `<button type="button" data-k="${k}">${k}</button>`);
  keys.insertAdjacentHTML("beforeend", `<button type="button" class="wide" data-k="go">vend</button>`);
  keys.addEventListener("click", (e) => {
    const k = e.target.closest("button")?.dataset.k;
    if (!k) return;
    if (k === "go") return vend();
    if (/[ABC]/.test(k)) entry = k;
    else if (entry.length === 1) entry += k;
    display.textContent = entry || "select";
  });
  function vend() {
    const item = ITEMS[entry];
    if (!item) { display.textContent = "letter + number"; entry = ""; return; }
    const slot = $(`.vend-slot[data-code="${entry}"]`);
    display.textContent = `${entry} · vending…`;
    slot.classList.add("drop");
    setTimeout(() => {
      tray.innerHTML = `<div class="item">${icon(item[1])}${item[0]}</div>`;
      display.textContent = "enjoy outside";
    }, 450);
    setTimeout(() => slot.classList.remove("drop"), 1600); // restock
    entry = "";
  }

  /* ---------- reveal on scroll ---------- */
  const targets = [...$$(".section-head, .plot, .branch-copy, .branch-art, .more-card, .about > *")];
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
})();
