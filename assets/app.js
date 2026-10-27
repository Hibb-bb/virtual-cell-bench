/* Virtual Cell Bench — shared chrome, data loading, chart helpers and the ability board.
   Every page sets <body data-page="..." data-base="./ or ../">; this module draws the nav and
   footer, then dispatches to the page's renderer. No dependencies. */

export const BASE = document.body.dataset.base || './';
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (x, d = 2) => (x == null || Number.isNaN(x) ? '–' : Number(x).toFixed(d));
export const sgn = (x, d = 2) => (x == null || Number.isNaN(x) ? '–' : (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d));
export const int = (x) => (x == null ? '–' : Math.round(x).toLocaleString('en-US'));
export const pct = (x, d = 0) => (x == null ? '–' : (100 * x).toFixed(d) + '%');
export const compact = (x) => (x >= 1e6 ? (x / 1e6).toFixed(x >= 1e7 ? 0 : 1) + 'M' : x >= 1e3 ? (x / 1e3).toFixed(x >= 1e4 ? 0 : 1) + 'k' : String(x));

/* ---------- data ---------- */
const cache = new Map();
export async function getJSON(path) {
  if (!cache.has(path)) cache.set(path, fetch(BASE + path + '?v=621f4fa3ed').then((r) => { if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); }));
  return cache.get(path);
}
export const bench = () => getJSON('data/bench.json');

/* ---------- families and colours: a fixed order per component, never cycled ---------- */
const FAM_REPR = ['PCA', 'Kernel features', 'ICA', 'NMF', 'GMM', 'Random projection', 'scVI', 'Foundation model', 'Floor'];
const FAM_PERT = ['Ridge', 'PCA regression', 'KNN', 'Gaussian process', 'Low-rank', 'MLP', 'scVI', 'scGen', 'Mean shift', 'Floor'];
const SLOT = { repr: { PCA: 1, 'Kernel features': 2, ICA: 3, NMF: 4, GMM: 5, 'Random projection': 6, scVI: 7, 'Foundation model': 8, Floor: 0 },
               pert: { Ridge: 1, 'PCA regression': 2, KNN: 3, 'Gaussian process': 4, 'Low-rank': 5, MLP: 6, scVI: 7, scGen: 8, 'Mean shift': 0, Floor: 0 } };
export const famColor = (comp, fam) => `var(--s${SLOT[comp]?.[fam] ?? 0})`;
export const famOrder = (comp) => (comp === 'repr' ? FAM_REPR : FAM_PERT);
export const familyOf = (b, rid) => b.respondents[rid]?.family || 'Other';
/* Boards show the featured models by default (one or two per simple family, every learned model); "show all" reveals the full pool. */
let showAll = false;
try { showAll = localStorage.getItem('vcb-showall') === '1'; } catch (e) { /* no storage */ }
export const allModels = () => showAll;
export const setAllModels = (v) => { showAll = !!v; try { localStorage.setItem('vcb-showall', v ? '1' : '0'); } catch (e) { /* no storage */ } };
export const view = (b, scale) => (showAll ? scale : { ...scale, abilities: scale.abilities.filter((a) => b.respondents[a.rid]?.featured) });
export const allToggle = (id, n, shown) => `<label class="toggle"><input type="checkbox" id="${id}"${showAll ? ' checked' : ''}> show all ${n} models <span class="faint">(${shown} featured)</span></label>`;
export const nameOf = (b, rid) => b.respondents[rid]?.name || rid;

/* ---------- chrome ---------- */
const PAPER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>';
const PAGES = [['leaderboard/', 'Leaderboard'], ['datasets/', 'Datasets'], ['items/', 'Items'], ['analysis/', 'Analysis'], ['anatomy/', 'Hard items'], ['link/', 'Repr → pert'], ['how/', 'How it works'], ['contribute/', 'Contribute'], ['versions/', 'Versions']];
const MARK = `<svg class="mark" viewBox="0 0 22 22" aria-hidden="true"><rect x="10" y="1" width="2" height="20" rx="1" fill="currentColor"/><rect x="2" y="14" width="7" height="2" rx="1" fill="currentColor" opacity=".55"/><rect x="4" y="9" width="5" height="2" rx="1" fill="currentColor" opacity=".55"/><rect x="6" y="4" width="3" height="2" rx="1" fill="currentColor" opacity=".55"/><circle cx="16" cy="6" r="2.4" fill="var(--accent)"/><circle cx="16" cy="12.5" r="2.4" fill="var(--accent)" opacity=".7"/><circle cx="16" cy="18" r="2.4" fill="var(--accent)" opacity=".4"/></svg>`;
const SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;

function chrome() {
  const page = document.body.dataset.page;
  const nav = $('#nav');
  if (nav) {
    nav.className = 'nav';
    nav.innerHTML = `<div class="nav-inner">
      <a class="brand" href="${BASE}">${MARK}<span>Virtual Cell Bench</span><span class="ver">0.1</span></a>
      <nav class="nav-links" aria-label="Site">${PAGES.map(([h, l]) => `<a href="${BASE}${h}"${page === h.replace('/', '') ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <a class="theme-btn" href="${BASE}virtual-cell-bench-0.1.pdf" title="Read the paper (PDF)" aria-label="Read the paper (PDF)">${PAPER}</a></div>`;
  }
  const foot = $('#footer');
  if (foot) {
    foot.className = 'footer';
    foot.innerHTML = `<div class="footer-inner"><span>Virtual Cell Bench 0.1 · a living item-response benchmark for virtual cell models.</span>
      <span><a href="${BASE}virtual-cell-bench-0.1.pdf">paper (PDF)</a> · <a href="https://github.com/Hibb-bb/vc-benchmark">Code and item bank on GitHub</a> · <a href="${BASE}versions/">scale versions</a> · <a href="${BASE}contribute/">contribute</a></span></div>`;
  }
  // one floating tooltip for every chart; marks carry data-tip (HTML allowed, we build it ourselves)
  const tip = document.createElement('div'); tip.id = 'tip'; tip.hidden = true; document.body.appendChild(tip);
  document.addEventListener('mousemove', (e) => {
    const m = e.target.closest?.('[data-tip]');
    if (!m) { tip.hidden = true; return; }
    tip.innerHTML = m.dataset.tip; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(e.clientX + 14, innerWidth - w - 8) + 'px';
    tip.style.top = (e.clientY + 16 + h > innerHeight ? e.clientY - h - 10 : e.clientY + 16) + 'px';
  });
  document.addEventListener('mouseleave', () => { tip.hidden = true; });
}

/* ---------- small SVG toolkit ---------- */
export const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
export const niceTicks = (a, b, n = 6) => {
  const span = b - a, raw = span / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  const step = p * (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10);
  const out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
};
export const svgOpen = (w, h, cls = '') => `<svg viewBox="0 0 ${w} ${h}" class="${cls}" role="img" preserveAspectRatio="xMidYMid meet">`;

/** Horizontal logit axis with ticks at y. */
export function xAxis(x, ticks, y, labelY = y + 14, fmtT = (t) => sgn(t, 0).replace('+0', '0').replace('−0', '0')) {
  return `<g class="axis"><line x1="${x(ticks[0])}" x2="${x(ticks[ticks.length - 1])}" y1="${y}" y2="${y}"/>${ticks.map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="${y}" y2="${y + 4}"/><text class="mono" x="${x(t)}" y="${labelY}" text-anchor="middle">${fmtT(t)}</text>`).join('')}</g>`;
}

/** Merge 0.25-logit bins into `k`-wide bins. edges from bench.edges. */
export function rebin(hist, edges, k = 2) {
  const out = [];
  for (let i = 0; i < hist.length; i += k) out.push({ x0: edges[i], x1: edges[Math.min(i + k, edges.length - 1)], n: hist.slice(i, i + k).reduce((a, b) => a + b, 0) });
  return out;
}

/** Sparkline histogram for cards (single series, no axis labels but a zero mark). */
export function spark(hist, edges, color = 'var(--s1)', w = 260, h = 44) {
  const bins = rebin(hist, edges, 2).filter((b) => b.x1 > -6 && b.x0 < 6);
  const max = Math.max(1, ...bins.map((b) => b.n));
  const x = lin(-6, 6, 0, w), bw = w / bins.length;
  return svgOpen(w, h) + bins.map((b, i) => `<rect x="${i * bw + 0.5}" width="${bw - 1}" y="${h - 6 - ((h - 8) * b.n) / max}" height="${((h - 8) * b.n) / max}" fill="${color}" opacity=".8"/>`).join('') +
    `<line x1="${x(0)}" x2="${x(0)}" y1="0" y2="${h - 4}" class="zero"/><text class="mono" x="2" y="${h - 1}" style="font-size:9px">−6</text><text class="mono" x="${w - 2}" y="${h - 1}" text-anchor="end" style="font-size:9px">+6</text></svg>`;
}

/** Full histogram with axis, optional shaded band [lo,hi] and vertical reference lines. */
export function histogram(hist, edges, { w = 560, h = 220, color = 'var(--s1)', band = null, lines = [], xlabel = 'item difficulty (logits)', k = 2 } = {}) {
  const bins = rebin(hist, edges, k);
  const max = Math.max(1, ...bins.map((b) => b.n));
  const m = { l: 44, r: 12, t: 12, b: 36 };
  const x = lin(-6, 6, m.l, w - m.r), y = lin(0, max, h - m.b, m.t);
  const yt = niceTicks(0, max, 4);
  let s = svgOpen(w, h);
  if (band) s += `<rect x="${x(band[0])}" width="${x(band[1]) - x(band[0])}" y="${m.t}" height="${h - m.b - m.t}" fill="var(--bg-3)"/>`;
  s += `<g class="grid">${yt.map((t) => `<line x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>`;
  s += bins.map((b) => `<rect class="mark" data-tip="<b>${sgn(b.x0, 2)} to ${sgn(b.x1, 2)}</b><br>${int(b.n)} items" x="${x(b.x0) + 1}" width="${Math.max(0, x(b.x1) - x(b.x0) - 2)}" y="${y(b.n)}" height="${y(0) - y(b.n)}" rx="2" fill="${color}" opacity=".85"/>`).join('');
  s += yt.map((t) => `<text class="mono" x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end">${compact(t)}</text>`).join('');
  s += xAxis(x, niceTicks(-6, 6, 6), h - m.b);
  s += `<text x="${(m.l + w - m.r) / 2}" y="${h - 4}" text-anchor="middle">${xlabel}</text>`;
  for (const l of lines) s += `<line x1="${x(l.v)}" x2="${x(l.v)}" y1="${m.t}" y2="${h - m.b}" stroke="${l.color || 'var(--fg)'}" stroke-dasharray="${l.dash || '4 3'}"/><text class="lab" x="${x(l.v) + 4}" y="${m.t + 10}">${esc(l.label)}</text>`;
  return s + '</svg>';
}

/** Horizontal box plot rows: rows = [{label, q:[q05,q25,q50,q75,q95], n, color}]. */
export function boxes(rows, { w = 640, labelW = 230, band = null, lines = [], xlabel = 'item difficulty (logits), pooled scale', domain = [-6, 6] } = {}) {
  const rh = 22, m = { t: 10, b: 36 }, h = m.t + rows.length * rh + m.b;
  const x = lin(domain[0], domain[1], labelW, w - 12);
  let s = svgOpen(w, h);
  if (band) s += `<rect x="${x(band[0])}" width="${x(band[1]) - x(band[0])}" y="${m.t}" height="${rows.length * rh}" fill="var(--bg-3)"/>`;
  s += `<g class="grid">${niceTicks(domain[0], domain[1], 6).map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t}" y2="${m.t + rows.length * rh}"/>`).join('')}</g>`;
  rows.forEach((r, i) => {
    const cy = m.t + i * rh + rh / 2, [a, b, c, d, e] = r.q;
    s += `<g class="mark" data-tip="<b>${esc(r.label)}</b><br>median ${sgn(c)}, IQR ${sgn(b)} to ${sgn(d)}<br>5th to 95th ${sgn(a)} to ${sgn(e)}<br>${int(r.n)} items">
      <line x1="${x(a)}" x2="${x(e)}" y1="${cy}" y2="${cy}" stroke="var(--fg-3)"/>
      <rect x="${x(b)}" width="${Math.max(1, x(d) - x(b))}" y="${cy - 7}" height="14" rx="2" fill="${r.color || 'var(--s1)'}" opacity=".8"/>
      <line x1="${x(c)}" x2="${x(c)}" y1="${cy - 8}" y2="${cy + 8}" stroke="var(--bg)" stroke-width="2.5"/>
      <text x="${labelW - 8}" y="${cy + 4}" text-anchor="end" class="lab">${esc(r.label)}</text><text class="mono" x="${labelW - 8}" y="${cy + 4}" text-anchor="end" style="font-size:9px;opacity:0" aria-hidden="true"></text></g>`;
  });
  for (const l of lines) s += `<line x1="${x(l.v)}" x2="${x(l.v)}" y1="${m.t}" y2="${m.t + rows.length * rh}" stroke="${l.color || 'var(--fg)'}" stroke-dasharray="4 3"/>`;
  s += xAxis(x, niceTicks(domain[0], domain[1], 6), m.t + rows.length * rh + 4);
  s += `<text x="${(labelW + w) / 2}" y="${h - 4}" text-anchor="middle">${xlabel}</text>`;
  return s + '</svg>';
}

/** Scatter with optional labels and error bars. pts = [{x, y, xe, ye, label, color, tip}]. */
export function scatter(pts, { w = 520, h = 400, xlabel = '', ylabel = '', labels = true, diag = false, fitLine = null, xdom = null, ydom = null } = {}) {
  const m = { l: 52, r: 16, t: 16, b: 44 };
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const pad = (a, b) => [a - (b - a) * 0.08 || -1, b + (b - a) * 0.08 || 1];
  const [x0, x1] = xdom || pad(Math.min(...xs), Math.max(...xs)), [y0, y1] = ydom || pad(Math.min(...ys), Math.max(...ys));
  const x = lin(x0, x1, m.l, w - m.r), y = lin(y0, y1, h - m.b, m.t);
  const xt = niceTicks(x0, x1, 5), yt = niceTicks(y0, y1, 5);
  let s = svgOpen(w, h);
  s += `<g class="grid">${xt.map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t}" y2="${h - m.b}"/>`).join('')}${yt.map((t) => `<line x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>`;
  if (x0 < 0 && x1 > 0) s += `<line class="zero" x1="${x(0)}" x2="${x(0)}" y1="${m.t}" y2="${h - m.b}"/>`;
  if (y0 < 0 && y1 > 0) s += `<line class="zero" x1="${m.l}" x2="${w - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;
  if (diag) { const a = Math.max(x0, y0), b = Math.min(x1, y1); s += `<line x1="${x(a)}" y1="${y(a)}" x2="${x(b)}" y2="${y(b)}" stroke="var(--fg-3)" stroke-dasharray="3 3"/>`; }
  if (fitLine) s += `<line x1="${x(x0)}" y1="${y(fitLine.a + fitLine.b * x0)}" x2="${x(x1)}" y2="${y(fitLine.a + fitLine.b * x1)}" stroke="var(--fg-3)" stroke-dasharray="5 4"/>`;
  for (const p of pts) {
    const c = p.color || 'var(--s1)';
    s += `<g class="mark" data-tip="${esc(p.tip || p.label)}">`;
    if (p.xe) s += `<line x1="${x(p.x - p.xe)}" x2="${x(p.x + p.xe)}" y1="${y(p.y)}" y2="${y(p.y)}" stroke="${c}" opacity=".5"/>`;
    if (p.ye) s += `<line x1="${x(p.x)}" x2="${x(p.x)}" y1="${y(p.y - p.ye)}" y2="${y(p.y + p.ye)}" stroke="${c}" opacity=".5"/>`;
    s += `<circle cx="${x(p.x)}" cy="${y(p.y)}" r="4.5" fill="${c}" stroke="var(--bg-2)" stroke-width="2"/>`;
    if (labels && p.label) s += `<text class="lab" x="${x(p.x) + 6}" y="${y(p.y) - 5}" style="font-size:10px">${esc(p.label)}</text>`;
    s += '</g>';
  }
  s += `<g class="axis"><line x1="${m.l}" x2="${w - m.r}" y1="${h - m.b}" y2="${h - m.b}"/><line x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${h - m.b}"/>${xt.map((t) => `<text class="mono" x="${x(t)}" y="${h - m.b + 14}" text-anchor="middle">${sgn(t, 1)}</text>`).join('')}${yt.map((t) => `<text class="mono" x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end">${sgn(t, 1)}</text>`).join('')}</g>`;
  s += `<text x="${(m.l + w - m.r) / 2}" y="${h - 6}" text-anchor="middle">${esc(xlabel)}</text><text transform="translate(12 ${(m.t + h - m.b) / 2}) rotate(-90)" text-anchor="middle">${esc(ylabel)}</text>`;
  return s + '</svg>';
}

/** Multi-series line chart. series = [{name, color, pts:[{x,y}], band:[{x,lo,hi}]?}] */
export function lines(series, { w = 560, h = 260, xlabel = '', ylabel = '', xdom = null, ydom = null, hlines = [], xfmt = (t) => String(t), yfmt = (t) => sgn(t, 1) } = {}) {
  const m = { l: 52, r: 16, t: 14, b: 44 };
  const allx = series.flatMap((s) => s.pts.map((p) => p.x)), ally = series.flatMap((s) => s.pts.map((p) => p.y)).concat(hlines.map((l) => l.v));
  const [x0, x1] = xdom || [Math.min(...allx), Math.max(...allx)], [y0, y1] = ydom || [Math.min(...ally), Math.max(...ally)];
  const x = lin(x0, x1, m.l, w - m.r), y = lin(y0, y1, h - m.b, m.t);
  const xt = niceTicks(x0, x1, 6), yt = niceTicks(y0, y1, 5);
  let s = svgOpen(w, h);
  s += `<g class="grid">${yt.map((t) => `<line x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>`;
  for (const l of hlines) s += `<line x1="${m.l}" x2="${w - m.r}" y1="${y(l.v)}" y2="${y(l.v)}" stroke="${l.color || 'var(--fg-3)'}" stroke-dasharray="4 3"/><text class="lab" x="${w - m.r}" y="${y(l.v) - 4}" text-anchor="end" style="font-size:10px">${esc(l.label)}</text>`;
  for (const sr of series) {
    if (sr.band) s += `<path d="M${sr.band.map((p) => `${x(p.x)},${y(p.hi)}`).join('L')}L${[...sr.band].reverse().map((p) => `${x(p.x)},${y(p.lo)}`).join('L')}Z" fill="${sr.color}" opacity=".12"/>`;
    s += `<path d="M${sr.pts.map((p) => `${x(p.x)},${y(p.y)}`).join('L')}" fill="none" stroke="${sr.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    const step = Math.max(1, Math.floor(sr.pts.length / 40));
    sr.pts.forEach((p, i) => { if (i % step === 0 || i === sr.pts.length - 1) s += `<circle class="mark" data-tip="<b>${esc(sr.name)}</b><br>${esc(xlabel)} ${xfmt(p.x)}<br>${esc(p.tip || yfmt(p.y))}" cx="${x(p.x)}" cy="${y(p.y)}" r="${sr.pts.length > 30 ? 2.5 : 4}" fill="${sr.color}" stroke="var(--bg-2)" stroke-width="1.5"/>`; });
  }
  s += `<g class="axis"><line x1="${m.l}" x2="${w - m.r}" y1="${h - m.b}" y2="${h - m.b}"/>${xt.map((t) => `<text class="mono" x="${x(t)}" y="${h - m.b + 14}" text-anchor="middle">${xfmt(t)}</text>`).join('')}${yt.map((t) => `<text class="mono" x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end">${yfmt(t)}</text>`).join('')}</g>`;
  s += `<text x="${(m.l + w - m.r) / 2}" y="${h - 6}" text-anchor="middle">${esc(xlabel)}</text><text transform="translate(12 ${(m.t + h - m.b) / 2}) rotate(-90)" text-anchor="middle">${esc(ylabel)}</text>`;
  return s + '</svg>';
}

export const legend = (comp, fams) => `<div class="legend">${fams.map((f) => `<span><i class="sw" style="--c:${famColor(comp, f)}"></i>${esc(f)}</span>`).join('')}</div>`;

/* ---------- the ability board: diverging bars from 0 (the average item) with SE whiskers ---------- */
export function board(el, b, comp, scale, { limit = null, detail = null, perGroup = null } = {}) {
  const ab = limit ? scale.abilities.slice(0, limit) : scale.abilities;
  const vals = scale.abilities.map((a) => a.ability);
  let lo = Math.min(0, ...vals.map((v, i) => v - 2 * scale.abilities[i].se)), hi = Math.max(0, ...vals.map((v, i) => v + 2 * scale.abilities[i].se));
  const padv = (hi - lo) * 0.06; lo -= padv; hi += padv;
  const x = lin(lo, hi, 0, 100);
  const ticks = niceTicks(lo, hi, 6);
  let open = null;
  const row = (a, i) => {
    const fam = familyOf(b, a.rid), c = famColor(comp, fam), neg = a.ability < 0;
    const l = neg ? x(a.ability) : x(0), wdt = Math.abs(x(a.ability) - x(0));
    const misfit = a.outfit != null && a.outfit > 2;
    return `<button type="button" class="brow${detail ? '' : ' still'}${open === a.rid ? ' on' : ''}" data-rid="${esc(a.rid)}" aria-expanded="${open === a.rid}">
      <span class="bname"><span class="rank">${i + 1}</span><i class="sw" style="--c:${c}"></i><b title="${esc(nameOf(b, a.rid))}">${esc(nameOf(b, a.rid))}</b>${misfit ? '<span class="chip warn" title="outfit above 2: this model passes and fails items its ability does not predict">misfit</span>' : ''}${a.placement === 'anchored' ? '<span class="chip" title="placed with item difficulties held fixed; the scale did not move">anchored</span>' : ''}</span>
      <span class="track" data-tip="<b>${esc(nameOf(b, a.rid))}</b><br>ability ${sgn(a.ability)} ± ${fmt(a.se)} logits<br>passes ${pct(a.p, 1)} of its ${int(a.n_items)} items<br>outfit ${fmt(a.outfit)}"><span class="zero" style="--z:${x(0)}%"></span><span class="bar-fill${neg ? ' neg' : ''}" style="--l:${l}%;--w:${wdt}%;--c:${c}"></span><span class="whisker" style="--l:${x(a.ability - a.se)}%;--w:${x(a.ability + a.se) - x(a.ability - a.se)}%"></span><span class="dot" style="--x:${x(a.ability)}%;--c:${c}"></span></span>
      <span class="bval">${sgn(a.ability)}<small>${pct(a.p, 0)} pass</small></span></button>${open === a.rid && detail ? detail(a) : ''}`;
  };
  const draw = () => {
    el.innerHTML = `<div class="board"><div class="board-axis"><span>ability (logits); 0 = average item</span><span class="ticks">${ticks.map((t) => `<i style="left:${x(t)}%">${sgn(t, 0).replace('+0', '0').replace('−0', '0')}</i>`).join('')}</span><span></span></div>${ab.map(row).join('')}</div>`;
    if (detail) $$('.brow', el).forEach((r) => r.addEventListener('click', () => { open = open === r.dataset.rid ? null : r.dataset.rid; draw(); r.scrollIntoView?.({ block: 'nearest' }); }));
  };
  draw();
}

/* ---------- Wright map: items and models on one vertical logit axis ---------- */
export function wright(el, b, comp, scale, { w = 620, h = 440, animate = true, maxLabels = 14 } = {}) {
  const bins = rebin(scale.hist, b.edges, 2);
  const max = Math.max(1, ...bins.map((x) => x.n));
  const m = { t: 38, b: 48 }, axisX = Math.round(w * 0.48), leftW = axisX - 24, rightW = w - axisX - 16;
  const y = lin(-6, 6, h - m.b, m.t), bw = lin(0, max, 0, leftW);
  const ab = scale.abilities;
  // label every model if the pool is small, otherwise the top, the floors and the family leaders
  const leaders = new Map();
  for (const a of ab) { const f = familyOf(b, a.rid); if (!leaders.has(f)) leaders.set(f, a.rid); }
  const labelled = new Set(ab.length <= maxLabels ? ab.map((a) => a.rid) : [...leaders.values(), ab[0].rid, ab[ab.length - 1].rid]);
  let s = svgOpen(w, h, 'wright');
  s += `<g class="grid">${niceTicks(-6, 6, 6).map((t) => `<line x1="12" x2="${w - 8}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>`;
  s += bins.map((bin, i) => `<rect class="hbar mark" style="--i:${i}" data-tip="<b>${sgn(bin.x0)} to ${sgn(bin.x1)} logits</b><br>${int(bin.n)} items" x="${axisX - 10 - bw(bin.n)}" width="${bw(bin.n)}" y="${y(bin.x1) + 1}" height="${Math.max(0, y(bin.x0) - y(bin.x1) - 2)}" rx="2"/>`).join('');
  s += `<line class="axis-main" x1="${axisX}" x2="${axisX}" y1="${y(6)}" y2="${y(-6)}"/>`;
  s += niceTicks(-6, 6, 6).map((t) => `<text class="mono" x="${axisX}" y="${y(t) + 4}" text-anchor="middle" style="font-size:10px;fill:var(--fg-3)"><tspan stroke="var(--bg)" stroke-width="4" paint-order="stroke">${sgn(t, 0).replace('+0', '0').replace('−0', '0')}</tspan></text>`).join('');
  // model stems on the right: each starts at the true ability on the axis and fans out to a dot at a
  // position nudged apart from its neighbours, so dots and labels never overlap
  const sorted = [...ab].sort((p, q) => q.ability - p.ability);
  // spread the dot positions apart symmetrically (a 1-D relaxation), so a cluster of near-equal
  // abilities opens up around its true centre instead of sliding down the figure
  const gap = 11, top = m.t + 6, bottom = h - m.b - 6;
  const ys = sorted.map((a) => y(a.ability));
  for (let it = 0; it < 300; it++) {
    for (let i = 0; i + 1 < ys.length; i++) { const d = ys[i + 1] - ys[i]; if (d < gap) { ys[i] -= (gap - d) / 2; ys[i + 1] += (gap - d) / 2; } }
    for (let i = 0; i < ys.length; i++) ys[i] = Math.min(bottom, Math.max(top, ys[i]));
  }
  const rows = sorted.map((a, i) => ({ a, ly: ys[i] }));
  rows.forEach(({ a, ly }, i) => {
    const fam = familyOf(b, a.rid), c = famColor(comp, fam), show = labelled.has(a.rid);
    s += `<g class="model mark" style="--i:${i}" data-tip="<b>${esc(nameOf(b, a.rid))}</b><br>ability ${sgn(a.ability)} ± ${fmt(a.se)}<br>${fam}">
      <line class="tick" x1="${axisX + 2}" x2="${axisX + 46}" y1="${y(a.ability)}" y2="${ly}" stroke="${c}" stroke-width="1.1" stroke-opacity="0.6"/>
      <circle cx="${axisX + 46}" cy="${ly}" r="3.6" fill="${c}" stroke="var(--bg-2)" stroke-width="1.5"/>
      ${show ? `<text class="tlab" x="${axisX + 54}" y="${ly + 3.5}">${esc(nameOf(b, a.rid))}</text>` : ''}</g>`;
  });
  s += `<text x="${axisX - 10}" y="12" text-anchor="end" class="lab" style="font-size:10.5px">items by difficulty</text><text x="${axisX + 14}" y="12" class="lab" style="font-size:10.5px">models by ability</text>`;
  // the two ends of the shared axis, so a cold reader knows which way is up
  s += `<text x="${axisX}" y="${m.t - 10}" text-anchor="middle" class="mono" style="font-size:10px;fill:var(--fg-2)">▲ hard items · high ability</text>`;
  s += `<text x="${axisX}" y="${h - m.b + 18}" text-anchor="middle" class="mono" style="font-size:10px;fill:var(--fg-2)">▼ easy items · low ability</text>`;
  s += `<text x="${axisX}" y="${h - 6}" text-anchor="middle" style="font-size:10.5px">logits · 0 = average item</text>`;
  el.innerHTML = s + '</svg>';
  // The finished map is the base state; the entrance animation is added a frame later so that a renderer
  // without a running animation timeline (thumbnails, headless captures) still shows the full figure.
  if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(() => el.querySelector('svg')?.classList.add('anim'));
}

/* ---------- boot ---------- */
chrome();
const page = document.body.dataset.page;
const modules = { home: './home.js?v=621f4fa3ed', leaderboard: './leaderboard.js?v=621f4fa3ed', datasets: './datasets.js?v=621f4fa3ed', items: './items.js?v=621f4fa3ed', analysis: './analysis.js?v=621f4fa3ed', anatomy: './anatomy.js?v=621f4fa3ed', link: './link.js?v=621f4fa3ed', how: './how.js?v=621f4fa3ed' };
if (modules[page]) import(modules[page]).then((m) => m.default()).catch((e) => { console.error(e); const el = $('#err'); if (el) { el.hidden = false; el.textContent = 'Could not load the data for this page: ' + e.message; } });
