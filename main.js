// field corp — interactions. No build step, no dependencies.
// Text, branches, Hub objects and timelapse photos come from content/*.json,
// which are edited with Pages CMS (see .pages.yml).
(() => {
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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
  let W, H, blades, bend, flowers = [];
  const pointer = { x: -9999, y: -9999 };

  function buildField() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    for (const [cv, c2] of [[canvas, ctx], [bloomCanvas, fctx]]) {
      cv.width = W * dpr; cv.height = H * dpr;
      c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
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
    fctx.clearRect(0, 0, W, H);
    fctx.lineWidth = 1.2;
    fctx.lineCap = "round";
    fctx.strokeStyle = css("--accent-2");
    for (const f of flowers) {
      f.g = Math.min(1, f.g + 0.03);
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
    startTypewriter(branches.map((b) => b.name));
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
  }

  function renderBranches(branches, site) {
    // plots
    const plots = branches.map((b, i) => `
      <a class="plot plot-${esc(b.drawing || "none")}" href="#${b.status === "seed" ? "more" : esc(b.slug)}">
        <div class="plot-art${b.photo ? " has-photo" : ""}">${b.photo ? `<img class="plot-photo" src="${esc(b.photo)}" alt="" loading="lazy">` : drawing(b.drawing)}</div>
        <div class="plot-meta">
          <span class="plot-no">plot ${pad(i + 1)}</span>
          <h3>field ${esc(b.name)}</h3>
          <p>${esc(b.summary)}</p>
          <span class="status ${STATUS_CLASS[b.status] || ""}">${esc(b.status)}</span>
        </div>
      </a>`);
    plots.push(`
      <a class="plot plot-empty" href="#contact">
        <div class="plot-art">${drawing("none")}</div>
        <div class="plot-meta">
          <span class="plot-no">plot ${pad(branches.length + 1)}</span>
          <h3>fallow</h3>
          <p>${esc(site.fallow_text || "this plot is open. got an experiment?")}</p>
        </div>
      </a>`);
    $(".plots").innerHTML = plots.join("");

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
    const targets = $$(".section-head, .plot, .branch-copy, .branch-art, .more-card, .about > *");
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
