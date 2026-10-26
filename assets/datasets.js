import { $, bench, spark, nameOf, int, sgn, pct, esc, compact } from './app.js';

export default async function datasets() {
  const b = await bench();
  $('#panel-cards').innerHTML = b.panels.map((p) => `<article class="card">
    <h3><span>${esc(p.name)}</span><span class="chip">${esc(p.held_out)} held out</span></h3>
    <p class="src">${esc(p.source)} · ${esc(p.licence)}</p>
    <div class="spark">${spark(p.hist, b.edges, 'var(--s1)')}</div>
    <dl>
      <dt>Items</dt><dd>${int(p.items)} cells in ${int(p.strata)} strata</dd>
      <dt>Cell types</dt><dd>${int(p.types)}</dd>
      <dt>Training cells</dt><dd>${int(p.train_cells)}</dd>
      <dt>Held out</dt><dd>${int(p.test_units)} ${esc(p.held_out)} of ${int(p.contexts)} contexts</dd>
      <dt>Nobody passes</dt><dd>${pct(p.nobody, 1)}</dd>
      <dt>Mean difficulty</dt><dd>${sgn(p.mean_difficulty)} (pooled scale)</dd>
    </dl>
    <p class="top">Top model: <b>${esc(nameOf(b, p.top.rid))}</b> at ${sgn(p.top.ability)}${p.scvi30 != null ? ` · scVI-30D ${sgn(p.scvi30)}` : ''}${p.pca128 != null ? ` · PCA-128D ${sgn(p.pca128)}` : ''}</p>
    <p class="small"><a href="../leaderboard/">board</a> · <a href="../items/#${esc(p.run)}">items</a></p>
  </article>`).join('');

  $('#screen-cards').innerHTML = b.screens.map((s) => `<article class="card">
    <h3><span>${esc(s.name)}</span><span class="chip">${esc(s.pert_type)}</span></h3>
    <p class="src">${esc(s.source)} · ${esc(s.licence)}</p>
    <div class="spark">${spark(s.hist, b.edges, 'var(--s2)')}</div>
    <dl>
      <dt>Items</dt><dd>${int(s.items)} conditions${s.items !== s.conditions ? ` of ${int(s.conditions)}` : ''}</dd>
      <dt>Perturbations</dt><dd>${int(s.perturbations)}${s.doses ? ` · ${s.doses} doses` : ''}</dd>
      <dt>Contexts</dt><dd>${int(s.contexts)}</dd>
      <dt>Cells</dt><dd>${compact(s.cells)} · median ${int(s.median_cells)} per item</dd>
      <dt>Nobody passes</dt><dd>${pct(s.nobody, 1)}</dd>
      <dt>Mean difficulty</dt><dd>${sgn(s.mean_difficulty)} (pooled scale)</dd>
    </dl>
    <p class="top">Unseen perturbation, top model: <b>${esc(nameOf(b, s.top.rid))}</b> at ${sgn(s.top.ability)}${s.context ? `<br>Unseen combination, top model: <b>${esc(nameOf(b, s.context.top.rid))}</b> at ${sgn(s.context.top.ability)} · nobody passes ${pct(s.context.nobody, 1)}` : ''}</p>
    <p class="small"><a href="../leaderboard/">board</a> · <a href="../items/#${esc(s.dataset)}">items</a></p>
  </article>`).join('');
}
