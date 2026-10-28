import { $, $$, bench, getJSON, lines, int, sgn, fmt, pct, esc } from './app.js?v=7eb4ae4502';

const BINS = [['no_reaction', 'no reaction', 'var(--s0)'], ['generic', 'generic reaction', 'var(--s4)'], ['specific', 'specific reaction', 'var(--s2)']];

export default async function anatomy() {
  const b = await bench();
  const A = await getJSON('data/anatomy.json');
  const T = await getJSON('data/anatomy_types.json');
  const panelLabel = Object.fromEntries(b.panels.map((p) => [p.run, p.label]));
  const screenName = Object.fromEntries(b.screens.map((s) => [s.dataset, s.name]));
  reprTypes(T, panelLabel);
  reprDecomposition(A, panelLabel);
  reprCorr(A);
  pertBins(A, b);
  pertByScreen(A, screenName);
  pertCorr(A, screenName);
  pertGroups(A);
}

/* ---------- representation ---------- */
function reprTypes(T, panelLabel) {
  const cols = T.columns;
  const rows = T.rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
  const COLS = [['cell_type', 'Cell type', false], ['panel', 'Panel', false], ['n_items', 'Items', true], ['mean_difficulty', 'Difficulty', true], ['nobody', 'Nobody passes', true], ['top_confusion', 'Most often confused with', false], ['top_confusion_share', 'Share of errors', true], ['top_confusion_dist', 'Ontology distance', true], ['nearest_label_dist', 'Nearest label', true], ['depth', 'Ontology depth', true]];
  let sortKey = 'mean_difficulty', asc = false, q = '', limit = 40;
  const el = $('#an-types');
  const draw = () => {
    let d = rows.filter((r) => !q || [r.cell_type, r.panel, r.top_confusion, panelLabel[r.panel]].some((v) => v && String(v).toLowerCase().includes(q)));
    d.sort((p, r) => { const a = p[sortKey], c = r[sortKey]; if (a == null) return 1; if (c == null) return -1; return (typeof a === 'number' ? a - c : String(a).localeCompare(String(c))) * (asc ? 1 : -1); });
    const cell = (r, k) => { const v = r[k]; if (k === 'panel') return esc(panelLabel[v] || v); if (k === 'mean_difficulty') return sgn(v); if (k === 'nobody' || k === 'top_confusion_share') return pct(v, 0); if (k === 'n_items') return int(v); if (v == null) return '–'; if (typeof v === 'number') return fmt(v, 0); return esc(v); };
    el.innerHTML = `<thead><tr>${COLS.map(([k, l, n]) => `<th class="sortable${n ? ' num' : ''}${k === sortKey ? ' sorted' + (asc ? ' asc' : '') : ''}" data-k="${k}">${l}</th>`).join('')}</tr></thead><tbody>${d.slice(0, limit).map((r) => `<tr>${COLS.map(([k, , n]) => `<td class="${n ? 'num' : ''}">${cell(r, k)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    $$('th.sortable', el).forEach((th) => th.addEventListener('click', () => { if (sortKey === th.dataset.k) asc = !asc; else { sortKey = th.dataset.k; asc = !COLS.find((c) => c[0] === sortKey)[2]; } draw(); }));
    $('#an-types-count').textContent = `${int(d.length)} types; showing ${Math.min(limit, d.length)}`;
  };
  $('#an-types-q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  $('#an-types-more').addEventListener('click', () => { limit += 40; draw(); });
  draw();
}

function reprDecomposition(A, panelLabel) {
  const rows = Object.entries(A.A_decomposition).sort((p, q) => q[1].r2_stratum - p[1].r2_stratum);
  const w = 640, lw = 290, rh = 26, h = rows.length * rh + 34;
  const x = (v) => lw + (w - lw - 12) * v;
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid meet"><g class="grid">${[0, 0.25, 0.5, 0.75, 1].map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="4" y2="${rows.length * rh + 6}"/>`).join('')}</g>`;
  rows.forEach(([run, d], i) => {
    const y = i * rh + 6;
    s += `<text class="lab" x="${lw - 8}" y="${y + 14}" text-anchor="end">${esc(panelLabel[run] || run)}</text>
      <rect class="mark" data-tip="<b>${esc(panelLabel[run] || run)}</b><br>cell type explains ${pct(d.r2_type)} of cell difficulty variance<br>${int(d.n)} informative cells" x="${x(0)}" y="${y}" width="${x(d.r2_type) - x(0)}" height="8" rx="2" fill="var(--s1)" opacity=".9"/>
      <rect class="mark" data-tip="<b>${esc(panelLabel[run] || run)}</b><br>stratum (type × donor × context) explains ${pct(d.r2_stratum)}" x="${x(0)}" y="${y + 10}" width="${x(d.r2_stratum) - x(0)}" height="8" rx="2" fill="var(--s7)" opacity=".9"/>`;
  });
  s += `<g class="axis">${[0, 0.25, 0.5, 0.75, 1].map((t) => `<text class="mono" x="${x(t)}" y="${h - 6}" text-anchor="middle">${pct(t)}</text>`).join('')}</g></svg>`;
  $('#an-decomp').innerHTML = s + `<div class="legend"><span><i class="sw" style="--c:var(--s1)"></i>cell type</span><span><i class="sw" style="--c:var(--s7)"></i>stratum: type × donor × context</span></div>`;
}

function reprCorr(A) {
  const c = A.A_corr;
  const lab = { difficulty_vs_nearest_label_dist: 'ontology distance to the nearest other label in the panel', difficulty_vs_depth: 'ontology depth of the label', difficulty_vs_log_train_support: 'log training cells of the type' };
  $('#an-acorr').innerHTML = `<thead><tr><th>Covariate</th><th class="num">Spearman</th><th class="num">n</th></tr></thead><tbody>${Object.entries(c).map(([k, v]) => `<tr><td>${lab[k] || k}</td><td class="num">${sgn(v.rho)}</td><td class="num">${int(v.n)}</td></tr>`).join('')}</tbody>`;
  const cov = Object.values(A.A_ontology_coverage);
  $('#an-acorr-note').textContent = `Ontology distances exist only where labels carry Cell Ontology ids: Tabula Sapiens and the scBaseCount panels (coverage 1.0), a few percent of the other atlases. ${pct(A.A_confusion_within2)} of wrong predictions land within distance 2 of the true label (a sibling, parent or child). Items passed by nobody have a median confusion distance of ${A.A_nobody.conf_dist_median} against ${A.A_nobody.rest_conf_dist_median} for the rest.`;
  const H = A.A_confusion_distance_hist;
  const ks = Object.keys(H).map(Number).sort((p, q) => p - q), max = Math.max(...ks.map((k) => H[k]));
  const w = 520, h = 180, m = { l: 44, r: 12, t: 10, b: 36 }, bw = (w - m.l - m.r) / ks.length;
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid meet">`;
  ks.forEach((k, i) => { const hh = ((h - m.t - m.b) * H[k]) / max; s += `<rect class="mark" data-tip="distance ${k}: ${int(H[k])} wrong predictions" x="${m.l + i * bw + 2}" y="${h - m.b - hh}" width="${bw - 4}" height="${hh}" rx="2" fill="var(--s1)" opacity=".85"/><text class="mono" x="${m.l + i * bw + bw / 2}" y="${h - m.b + 14}" text-anchor="middle">${k}</text>`; });
  s += `<text x="${(m.l + w - m.r) / 2}" y="${h - 4}" text-anchor="middle">ontology distance between the true label and the predicted one</text></svg>`;
  $('#an-confdist').innerHTML = s;
}

/* ---------- perturbation ---------- */
function pertBins(A, b) {
  const TH = A.B_bin_thresholds;
  $('#an-thresholds').innerHTML = `<dl><dt>No reaction</dt><dd>${esc(TH.no_reaction)}</dd><dt>Generic reaction</dt><dd>${esc(TH.generic)}</dd><dt>Specific reaction</dt><dd>${esc(TH.specific)}</dd></dl>`;
  const scales = [['pooled', 'Unseen perturbation, 15 screens'], ['pooled_context', 'Unseen combination, 5 screens']];
  $('#an-bins').innerHTML = scales.map(([k, label]) => {
    const B = A.B[k];
    const rows = BINS.map(([id, name, color]) => ({ id, name, color, ...B.bins[id] }));
    const lo = Math.min(0, ...rows.map((r) => r.mean_difficulty)) - 0.5, hi = Math.max(0, ...rows.map((r) => r.mean_difficulty)) + 0.5;
    const w = 520, lw = 150, rh = 30, h = rows.length * rh + 40, x = (v) => lw + ((w - lw - 12) * (v - lo)) / (hi - lo);
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid meet"><line class="zero" x1="${x(0)}" x2="${x(0)}" y1="4" y2="${rows.length * rh + 8}"/>`;
    rows.forEach((r, i) => {
      const y = i * rh + 8, neg = r.mean_difficulty < 0;
      s += `<text class="lab" x="${lw - 8}" y="${y + 13}" text-anchor="end">${esc(r.name)}</text><rect class="mark" data-tip="<b>${esc(r.name)}</b><br>${int(r.n)} items · mean difficulty ${sgn(r.mean_difficulty)}<br>nobody passes ${pct(r.nobody)} · pass rate ${pct(r.pass_rate)}" x="${neg ? x(r.mean_difficulty) : x(0)}" y="${y}" width="${Math.abs(x(r.mean_difficulty) - x(0))}" height="18" rx="2" fill="${r.color}" opacity=".9"/><text class="mono" x="${neg ? x(0) + 6 : x(r.mean_difficulty) + 6}" y="${y + 13}" style="font-size:10px">${sgn(r.mean_difficulty)} · n=${int(r.n)} · nobody ${pct(r.nobody)}</text>`;
    });
    s += `<g class="axis">${[-2, -1, 0, 1, 2, 3, 4].filter((t) => t >= lo && t <= hi).map((t) => `<text class="mono" x="${x(t)}" y="${h - 6}" text-anchor="middle">${sgn(t, 0).replace('+0', '0').replace('−0', '0')}</text>`).join('')}</g></svg>`;
    return `<div class="fig"><h3>${label}</h3><p class="sub">${int(B.n)} conditions · mean difficulty on this scale, bar from the average item</p>${s}</div>`;
  }).join('');
}

function pertByScreen(A, screenName) {
  const B = A.B.pooled;
  const rows = Object.entries(B.bins_by_dataset).map(([ds, bins]) => { const n = Object.values(bins).reduce((a, x) => a + x.n, 0); return { ds, n, bins, noshare: (bins.no_reaction?.n || 0) / n }; }).sort((p, q) => q.noshare - p.noshare);
  const w = 640, lw = 230, rh = 22, h = rows.length * rh + 34, x = (v) => lw + (w - lw - 12) * v;
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid meet">`;
  rows.forEach((r, i) => {
    const y = i * rh + 6; let cx = 0;
    s += `<text class="lab" x="${lw - 8}" y="${y + 13}" text-anchor="end">${esc(screenName[r.ds] || r.ds)}</text>`;
    for (const [id, name, color] of BINS) { const bn = r.bins[id]; if (!bn) continue; const ww = x(cx + bn.n / r.n) - x(cx); s += `<rect class="mark" data-tip="<b>${esc(screenName[r.ds] || r.ds)}</b><br>${name}: ${int(bn.n)} of ${int(r.n)} (${pct(bn.n / r.n)})<br>mean difficulty ${sgn(bn.mean_difficulty)} · nobody passes ${pct(bn.nobody)}" x="${x(cx) + 1}" y="${y}" width="${Math.max(0, ww - 2)}" height="${rh - 6}" rx="2" fill="${color}" opacity=".9"/>`; cx += bn.n / r.n; }
  });
  s += `<g class="axis">${[0, 0.25, 0.5, 0.75, 1].map((t) => `<text class="mono" x="${x(t)}" y="${h - 6}" text-anchor="middle">${pct(t)}</text>`).join('')}</g></svg>`;
  $('#an-screens').innerHTML = s + `<div class="legend">${BINS.map(([, n, c]) => `<span><i class="sw" style="--c:${c}"></i>${n}</span>`).join('')}</div>`;
  const tian = B.bins_by_dataset.TianKampmann2019_iPSC;
  if (tian) $('#an-screens-note').textContent = `Tian 2019 iPSC is almost entirely no-reaction: ${int(tian.no_reaction.n)} of ${int(tian.no_reaction.n + (tian.specific?.n || 0))} conditions have fewer than ten responding genes or an unreduced target, which is why nothing beats the mean shift on it. Screens are sorted by their no-reaction share.`;
}

function pertCorr(A, screenName) {
  const lab = { n_resp_genes: 'responding genes (|z| > 3)', cos_generic: 'cosine to the context mean shift', delta_l2: 'effect size (L2)', on_target_lfc: 'on-target change', target_ctrl_mean: 'target expression in controls', n_cells: 'cells per condition', dose: 'dose' };
  const keys = Object.keys(A.B.pooled.corr);
  $('#an-bcorr').innerHTML = `<thead><tr><th>Covariate</th><th class="num">Unseen perturbation</th><th class="num">n</th><th class="num">Unseen combination</th><th class="num">n</th></tr></thead><tbody>${keys.map((k) => { const p = A.B.pooled.corr[k], c = A.B.pooled_context.corr[k]; return `<tr><td>${lab[k] || k}</td><td class="num">${sgn(p.rho)}</td><td class="num">${int(p.n)}</td><td class="num">${sgn(c.rho)}</td><td class="num">${int(c.n)}</td></tr>`; }).join('')}</tbody>`;
  const W = A.B.pooled.corr_within_dataset, ck = ['n_resp_genes', 'cos_generic', 'delta_l2'];
  $('#an-bcorr-ds').innerHTML = `<thead><tr><th>Screen (unseen perturbation)</th>${ck.map((k) => `<th class="num">${lab[k]}</th>`).join('')}</tr></thead><tbody>${Object.entries(W).map(([ds, c]) => `<tr><td>${esc(screenName[ds] || ds)}</td>${ck.map((k) => `<td class="num">${c[k] && c[k].rho != null ? sgn(c[k].rho) : '–'}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

function pertGroups(A) {
  const row = (label, scale, key) => { const g = A.B[scale][key]; const f = g.False || g['false'], t = g.True || g['true']; return `<tr><td>${label}</td><td class="num">${int(t.size)} / ${int(f.size)}</td><td class="num">${sgn(t.mean)} / ${sgn(f.mean)}</td><td class="num">${key === 'tf' ? (A.B[scale].tf_p < 1e-3 ? A.B[scale].tf_p.toExponential(1) : fmt(A.B[scale].tf_p, 2)) : '–'}</td></tr>`; };
  $('#an-groups').innerHTML = `<thead><tr><th>Genetic screens</th><th class="num">n (yes / no)</th><th class="num">mean difficulty (yes / no)</th><th class="num">Mann–Whitney p</th></tr></thead><tbody>${row('Target is a transcription factor, unseen perturbation', 'pooled', 'tf')}${row('Target in the K562 essential screen, unseen perturbation', 'pooled', 'essential')}${row('Target is a transcription factor, unseen combination', 'pooled_context', 'tf')}${row('Target in the K562 essential screen, unseen combination', 'pooled_context', 'essential')}</tbody>`;
}
