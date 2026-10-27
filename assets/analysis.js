import { $, $$, bench, getJSON, lines, boxes, nameOf, familyOf, famColor, int, sgn, fmt, pct, esc } from './app.js?v=9eaa846c13';

export default async function analysis() {
  const b = await bench();
  covariates(b);
  bySource(b);
  coverage(b);
  headToHead(b);
  await adaptive(b);
}

/* ---- difficulty against covariates: binned medians with IQR band ---- */
function curve(el, pts, { xlabel, color, xfmt }) {
  const series = [{ name: 'median difficulty', color, pts: pts.map((p) => ({ x: p.x, y: p.q50, tip: `median ${sgn(p.q50)} · IQR ${sgn(p.q25)} to ${sgn(p.q75)} · ${int(p.n)} items` })), band: pts.map((p) => ({ x: p.x, lo: p.q25, hi: p.q75 })) }];
  el.innerHTML = lines(series, { w: 520, h: 240, xlabel, ylabel: 'difficulty (logits)', xfmt, hlines: [{ v: 0, label: 'average item' }] });
}
function covariates(b) {
  const A = b.covariates.repr, B = b.covariates.pert;
  const pow = (t) => (t >= 3 ? `${Math.round(10 ** t / 1000)}k` : `${Math.round(10 ** t)}`);
  curve($('#cov-depth'), A.curves.log_counts, { xlabel: 'total counts per cell', color: 'var(--s1)', xfmt: pow });
  curve($('#cov-support'), A.curves.log_support, { xlabel: 'training cells of the same type', color: 'var(--s1)', xfmt: pow });
  curve($('#cov-effect'), B.curves.log_effect, { xlabel: 'effect size, L2 norm of the delta', color: 'var(--s2)', xfmt: (t) => fmt(10 ** t, 1) });
  curve($('#cov-cells'), B.curves.log_n_cells, { xlabel: 'cells per condition', color: 'var(--s2)', xfmt: pow });
  $('#cov-depth-sub').textContent = `Spearman ${sgn(A.pooled.log_counts)} over ${int(b.totals.informative_repr)} informative cells: shallow cells are harder.`;
  $('#cov-support-sub').textContent = `Spearman ${sgn(A.pooled.log_support)} on the pooled scale. Support matters within curated atlases and barely at all on scBaseCount, where label vocabularies dominate.`;
  $('#cov-effect-sub').textContent = `Spearman ${sgn(B.pooled.log_effect)} over ${int(b.totals.informative_pert)} informative conditions.`;
  $('#cov-cells-sub').textContent = `Spearman ${sgn(B.pooled.log_n_cells)}: deeper pseudobulks are slightly easier to beat the mean shift on.`;
  const pl = Object.fromEntries(b.panels.map((p) => [p.run, p.label])), sl = Object.fromEntries(b.screens.map((s) => [s.dataset, s.name]));
  $('#cov-table-a').innerHTML = `<thead><tr><th>Panel</th><th class="num">depth</th><th class="num">genes detected</th><th class="num">train support</th></tr></thead><tbody>${Object.entries(A.by_panel).map(([r, c]) => `<tr><td>${esc(pl[r] || r)}</td><td class="num">${sgn(c.log_counts)}</td><td class="num">${sgn(c.log_genes)}</td><td class="num">${sgn(c.log_support)}</td></tr>`).join('')}</tbody>`;
  $('#cov-table-b').innerHTML = `<thead><tr><th>Screen</th><th class="num">effect size</th><th class="num">cells per condition</th></tr></thead><tbody>${Object.entries(B.by_screen).map(([r, c]) => `<tr><td>${esc(sl[r] || r)}</td><td class="num">${sgn(c.log_effect)}</td><td class="num">${sgn(c.log_n_cells)}</td></tr>`).join('')}</tbody>`;
}

/* ---- box plots by panel / screen ---- */
function poolBand(b, comp, scale) {
  const ab = scale.abilities.filter((a) => familyOf(b, a.rid) !== 'Floor');
  return { band: [Math.min(...scale.abilities.map((a) => a.ability)), Math.max(...ab.map((a) => a.ability))], best: Math.max(...ab.map((a) => a.ability)) };
}
function bySource(b) {
  const pa = poolBand(b, 'repr', b.scales.repr.pooled);
  const rowsA = [...b.panels].sort((p, q) => q.mean_difficulty - p.mean_difficulty).map((p) => ({ label: `${p.label} (n=${int(p.items)})`, q: p.quantiles, n: p.items, color: 'var(--s1)' }));
  $('#box-a').innerHTML = boxes(rowsA, { w: 640, labelW: 300, band: pa.band, lines: [{ v: pa.best }] });
  const pb = poolBand(b, 'pert', b.scales.pert.pooled);
  const rowsB = [...b.screens].sort((p, q) => q.mean_difficulty - p.mean_difficulty).map((s) => ({ label: `${s.name} (n=${int(s.items)})`, q: s.quantiles, n: s.items, color: 'var(--s2)' }));
  $('#box-b').innerHTML = boxes(rowsB, { w: 640, labelW: 300, band: pb.band, lines: [{ v: pb.best }] });
}

/* ---- coverage and information ---- */
const legend2 = () => '<div class="legend"><span><i class="sw" style="--c:var(--s1)"></i>representation</span><span><i class="sw" style="--c:var(--s2)"></i>perturbation</span></div>';
function coverage(b) {
  const R = b.retire;
  const mk = (key, name, color, field) => ({ name: `${name}: ${field}`, color, pts: R[key].curve.map((r) => ({ x: r.t, y: r[field], tip: pct(r[field], 1) })) });
  $('#retire-a').innerHTML = lines([mk('repr', 'representation', 'var(--s1)', 'uninformative'), mk('pert', 'perturbation', 'var(--s2)', 'uninformative')],
    { w: 520, h: 240, xlabel: 'probability threshold t', ylabel: 'fraction of items uninformative', ydom: [0, 0.6], yfmt: (t) => pct(t, 0), xfmt: (t) => fmt(t, 2) }) + legend2();
  $('#retire-foot').textContent = `At t = 0.95, ${pct(R.repr.curve[4].uninformative, 1)} of representation items and ${pct(R.pert.curve[4].uninformative, 1)} of perturbation items are uninformative for the current pool; almost all of them are too hard, not too easy (${pct(R.repr.curve[4].easy, 1)} and ${pct(R.pert.curve[4].easy, 1)} too easy).`;
  const infoSeries = [['repr', 'representation', 'var(--s1)'], ['pert', 'perturbation', 'var(--s2)']].map(([k, n, c]) => { const I = R[k].information; const m = Math.max(...I.info); return { name: n, color: c, pts: I.grid.map((g, i) => ({ x: g, y: I.info[i] / m, tip: `${fmt(I.info[i] / m, 2)} of peak` })) }; });
  $('#info').innerHTML = (lines(infoSeries, { w: 520, h: 240, xlabel: 'ability (logits)', ylabel: 'test information, share of peak', ydom: [0, 1.05], yfmt: (t) => fmt(t, 1), xfmt: (t) => sgn(t, 0), hlines: [] })
    .replace('</svg>', [['repr', 'var(--s1)'], ['pert', 'var(--s2)']].map(([k, c]) => { const x = 52 + ((R[k].theta_best + 6) / 12) * (520 - 68); return `<line x1="${x}" x2="${x}" y1="14" y2="196" stroke="${c}" stroke-dasharray="4 3"/>`; }).join('') + '</svg>')) + legend2();
}

/* ---- head to head ---- */
function headToHead(b) {
  let comp = 'repr';
  const data = () => (comp === 'repr' ? b.pairwise.repr : b.pairwise.pert.pooled);
  const selA = $('#h2h-a'), selB = $('#h2h-b');
  const fill = () => {
    const d = data();
    const scale = comp === 'repr' ? b.scales.repr.pooled : b.scales.pert.pooled;
    const order = scale.abilities.map((a) => a.rid).filter((r) => d.rids.includes(r));
    const opts = order.map((r) => `<option value="${esc(r)}">${esc(nameOf(b, r))}</option>`).join('');
    selA.innerHTML = opts; selB.innerHTML = opts;
    selA.value = comp === 'repr' ? 'scvi_k30_bnone' : 'mlp_h256_d50'; selB.value = comp === 'repr' ? 'pca_k128' : 'ridge_d50_lam100';
    if (!order.includes(selA.value)) selA.value = order[0];
    if (!order.includes(selB.value)) selB.value = order[1];
  };
  const draw = () => {
    const d = data(), i = d.rids.indexOf(selA.value), j = d.rids.indexOf(selB.value);
    const groups = d.groups.map((g) => ({ label: g.label, c: g.counts[i][j] })).filter((g) => g.c.reduce((a, x) => a + x, 0) > 0);
    const tot = [0, 0, 0, 0]; groups.forEach((g) => g.c.forEach((v, k) => { tot[k] += v; }));
    const n = tot.reduce((a, x) => a + x, 0);
    $('#h2h-summary').innerHTML = `<b>${esc(nameOf(b, selA.value))}</b> vs <b>${esc(nameOf(b, selB.value))}</b> on ${int(n)} items: both pass ${pct(tot[0] / n)}, only the first ${pct(tot[1] / n)}, only the second ${pct(tot[2] / n)}, neither ${pct(tot[3] / n)}. Agreement ${pct((tot[0] + tot[3]) / n)}.`;
    const w = 640, lw = 290, rh = 22, h = groups.length * rh + 30;
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid meet">`;
    const cols = ['var(--s3)', 'var(--s1)', 'var(--s2)', 'var(--s0)'], names = ['both pass', 'only first', 'only second', 'neither'];
    groups.forEach((g, r) => {
      const t = g.c.reduce((a, x) => a + x, 0); let x = lw; const y = r * rh + 6;
      s += `<text class="lab" x="${lw - 8}" y="${y + 14}" text-anchor="end">${esc(g.label)}</text>`;
      g.c.forEach((v, k) => { const ww = ((w - lw - 10) * v) / t; if (ww > 0) s += `<rect class="mark" data-tip="<b>${esc(g.label)}</b><br>${names[k]}: ${pct(v / t, 1)} (${int(v)} of ${int(t)})" x="${x + 1}" y="${y}" width="${Math.max(0, ww - 2)}" height="${rh - 6}" rx="2" fill="${cols[k]}" opacity=".85"/>`; x += ww; });
    });
    s += `<g class="axis">${[0, 0.25, 0.5, 0.75, 1].map((t) => `<text class="mono" x="${lw + (w - lw - 10) * t}" y="${h - 6}" text-anchor="middle">${pct(t)}</text>`).join('')}</g></svg>`;
    $('#h2h-chart').innerHTML = s;
  };
  $$('#h2h-comp button').forEach((btn) => btn.addEventListener('click', () => { comp = btn.dataset.comp; $$('#h2h-comp button').forEach((x) => { x.classList.toggle('on', x === btn); x.setAttribute('aria-pressed', x === btn); }); fill(); draw(); }));
  selA.addEventListener('change', draw); selB.addEventListener('change', draw);
  fill(); draw();
}

/* ---- adaptive exam ----
   Rasch: P(pass) = sigmoid(theta - b). With difficulties b fixed, the ability theta of a new
   model is the maximiser of sum_i [u_i log p_i + (1-u_i) log(1-p_i)] - theta^2 / (2 tau^2),
   tau = 3 as in the full fit. Newton: theta += (sum(u - p) - theta/tau^2) / (sum p(1-p) + 1/tau^2).
   Item selection: the unanswered item with difficulty nearest theta, i.e. maximal information. */
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function estimate(answered, tau = 3) {
  let th = 0;
  for (let it = 0; it < 8; it++) {
    let g = -th / (tau * tau), h = 1 / (tau * tau);
    for (const [bi, u] of answered) { const p = sigmoid(th - bi); g += u - p; h += p * (1 - p); }
    th += g / h;
    if (Math.abs(g / h) < 1e-5) return [th, 1 / Math.sqrt(h)];
  }
  return [th, NaN];
}
function runCat(items, j, maxN, random, rng) {
  // items: [difficulty, passmask, obsmask]; bit j of passmask is this model's response
  const bit = (m, k) => Math.floor(m / 2 ** k) % 2;
  const pool = items.filter((it) => bit(it[2], j) === 1).map((it) => [it[0], bit(it[1], j)]);
  const used = new Set(), answered = [], trace = [];
  let th = 0;
  if (random) for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }
  for (let n = 1; n <= Math.min(maxN, pool.length); n++) {
    let best = -1, bd = Infinity;
    if (random) { best = n - 1; } else { pool.forEach((it, i) => { if (!used.has(i)) { const d = Math.abs(it[0] - th); if (d < bd) { bd = d; best = i; } } }); }
    used.add(best); answered.push(pool[best]);
    const [t, se] = estimate(answered); th = t;
    if (n <= 30 || n % 5 === 0) trace.push({ x: n, y: th, se });
  }
  return trace;
}
async function adaptive(b) {
  const A = await getJSON('data/adaptive.json');
  let comp = 'repr', seed = 1;
  const sel = $('#cat-rid');
  const data = () => (comp === 'repr' ? A.repr : A.pert.pooled);
  const scale = () => (comp === 'repr' ? b.scales.repr.pooled : b.scales.pert.pooled);
  const fill = () => { const rids = scale().abilities.map((a) => a.rid).filter((r) => data().rids.includes(r)); sel.innerHTML = rids.map((r) => `<option value="${esc(r)}">${esc(nameOf(b, r))}</option>`).join(''); sel.value = rids.includes('pca_k32') ? 'pca_k32' : rids[Math.floor(rids.length / 2)]; };
  const draw = () => {
    const d = data(), j = d.rids.indexOf(sel.value);
    let s = seed; const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const full = scale().abilities.find((a) => a.rid === sel.value);
    const cat = runCat(d.items, j, 300, false, rng), rnd = runCat(d.items, j, 300, true, rng);
    const c = famColor(comp, familyOf(b, sel.value));
    $('#cat-chart').innerHTML = lines([
      { name: 'adaptive order', color: c, pts: cat.map((p) => ({ x: p.x, y: p.y, tip: `estimate ${sgn(p.y)} ± ${fmt(p.se)}` })), band: cat.map((p) => ({ x: p.x, lo: p.y - p.se, hi: p.y + p.se })) },
      { name: 'random order', color: 'var(--s0)', pts: rnd.map((p) => ({ x: p.x, y: p.y, tip: `estimate ${sgn(p.y)} ± ${fmt(p.se)}` })) },
    ], { w: 640, h: 300, xlabel: 'items answered', ylabel: 'ability estimate (logits)', ydom: [Math.min(-2, full.ability - 2), Math.max(2, full.ability + 2)], xfmt: (t) => String(Math.round(t)), hlines: [{ v: full.ability, label: `full bank: ${sgn(full.ability)} (${int(full.n_items)} items)` }] });
    const last = cat[cat.length - 1];
    $('#cat-foot').textContent = `${nameOf(b, sel.value)}: after ${last.x} adaptively chosen items the estimate is ${sgn(last.y)} ± ${fmt(last.se)} against ${sgn(full.ability)} from all ${int(full.n_items)} items. The band is one standard error. Items are drawn from a stratified sample of ${int(d.items.length)} informative items of this scale.`;
  };
  $$('#cat-comp button').forEach((btn) => btn.addEventListener('click', () => { comp = btn.dataset.comp; $$('#cat-comp button').forEach((x) => { x.classList.toggle('on', x === btn); x.setAttribute('aria-pressed', x === btn); }); fill(); draw(); }));
  sel.addEventListener('change', draw);
  $('#cat-run').addEventListener('click', () => { seed++; draw(); });
  fill(); draw();
}
