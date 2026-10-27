import { $, $$, bench, getJSON, board, wright, legend, famOrder, familyOf, nameOf, int, sgn, fmt, pct, compact, esc, scatter, view } from './app.js?v=e96b3ac623';

export default async function home() {
  // pipeline figure: play the staged reveal once it scrolls into view
  const pipe = document.querySelector('.scene-svg.pipeline');
  if (pipe) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { pipe.classList.add('anim'); io.disconnect(); } }, { threshold: 0.35 });
      io.observe(pipe);
    } else pipe.classList.add('anim');
  }

  const b = await bench();
  // hero Wright map
  wright($('#wright-hero'), b, 'repr', view(b, b.scales.repr.pooled), { animate: true });
  $('#wright-cap').textContent = `Pooled representation scale: ${int(b.totals.repr_items)} cells from ${b.totals.repr_panels} panels on the left, ${view(b, b.scales.repr.pooled).abilities.length} featured models of ${b.totals.respondents_repr} on the right; every model is on the leaderboard.`;

  // big numbers
  const t = b.totals;
  const nums = [
    [int(t.repr_items), 'cells as items', `${b.totals.repr_panels} annotation panels, ${int(t.repr_types)} cell types`],
    [int(t.pert_items), 'perturbation conditions', `${t.pert_screens} screens, ${int(t.pert_perturbations)} perturbations`],
    [compact(t.repr_train_cells + t.pert_cells), 'cells behind the items', 'training panels and screen replicates'],
    [`${t.respondents_repr}<small>+${t.respondents_pert}</small>`, 'models on the scales', 'classical ladders, floors and learned models'],
    [t.sources, 'public sources', 'CC0 and CC BY licensed atlases and screens'],
  ];
  $('#bignums').innerHTML = nums.map(([v, k, sub]) => `<div><dd>${v}</dd><dt>${esc(k)}<br><span class="faint">${esc(sub)}</span></dt></div>`).join('');

  // leaderboard preview
  let comp = 'repr';
  const drawBoard = () => {
    const scale = view(b, comp === 'repr' ? b.scales.repr.pooled : b.scales.pert.pooled_context);
    board($('#home-board'), b, comp, scale, { limit: 12 });
    const fams = famOrder(comp).filter((f) => scale.abilities.slice(0, 12).some((a) => familyOf(b, a.rid) === f));
    $('#home-legend').innerHTML = legend(comp, fams);
    $('#home-scale-note').textContent = comp === 'repr' ? `Top 12 of the ${scale.abilities.length} featured models on the pooled scale of all 14 panels (${int(scale.items)} items).` : `Top 12 of the ${scale.abilities.length} featured models on the pooled unseen-combination scale (${int(scale.items)} conditions, 5 multi-context screens).`;
  };
  $$('#home-comp button').forEach((btn) => btn.addEventListener('click', () => { comp = btn.dataset.comp; $$('#home-comp button').forEach((x) => { x.classList.toggle('on', x === btn); x.setAttribute('aria-pressed', x === btn); }); drawBoard(); }));
  drawBoard();

  // hardest types
  const hard = b.covariates.repr.hardest_types.slice(0, 10);
  const panelName = Object.fromEntries(b.panels.map((p) => [p.run, p.label]));
  $('#hard-list').innerHTML = `<div class="minis">${hard.map((h) => `<div class="mini"><span class="lab" title="${esc(h.type)} · ${esc(panelName[h.panel])}">${esc(h.type)} <span class="faint">· ${esc(panelName[h.panel])}</span></span><span class="val">${sgn(h.difficulty)}</span><span class="bar-mini"><i style="--l:0%;--w:${(100 * h.difficulty) / 4}%;--c:var(--s2)"></i></span></div>`).join('')}</div>`;

  // link teaser
  try {
    const L = await getJSON('data/link.json');
    const rows = L.cell_type_table;
    const pts = rows.map((r) => ({ x: r.a_diff, y: r.b_diff, xe: r.a_diff_se, ye: r.b_diff_se, label: r.type_n, tip: `<b>${esc(r.type_n)}</b><br>representation ${sgn(r.a_diff)} · perturbation ${sgn(r.b_diff)}<br>${int(r.b_n_cells)} cells per condition` }));
    $('#link-teaser').innerHTML = scatter(pts, { w: 520, h: 360, xlabel: 'representation difficulty of the cell type (logits)', ylabel: 'perturbation difficulty of its conditions (logits)' });
    const c = L.headline.A_panel__B_context_screen__cell_type;
    $('#link-foot').textContent = `Spearman ${sgn(c.spearman)} over ${c.n} types; ${sgn(c.spearman_partial_ncells)} after controlling for cells per condition.`;
  } catch (e) { $('#link-teaser').innerHTML = '<p class="empty">Link analysis not exported yet.</p>'; }

  $('#copy-bib')?.addEventListener('click', async (e) => {
    const txt = $('#bib').textContent;
    try { await navigator.clipboard.writeText(txt); e.target.textContent = 'Copied'; } catch (err) { const r = document.createRange(); r.selectNodeContents($('#bib')); getSelection().removeAllRanges(); getSelection().addRange(r); e.target.textContent = 'Select and copy'; }
    setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
  });
}
