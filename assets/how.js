import { $, bench, scatter, legend, famColor, nameOf, sgn, fmt, pct, esc } from './app.js?v=f8bd998902';

/* One model, fourteen tests: its pass rate on each panel against the panel's mean difficulty on the
   pooled scale. The pass rate moves with the panel; the ability on the pooled scale is one number. */
export default async function how() {
  const b = await bench();
  const panels = b.panels.filter((p) => b.scales.repr[p.run]);
  const rids = ['pca_k128', 'scvi_k30_bnone'];
  const pooled = Object.fromEntries(b.scales.repr.pooled.abilities.map((a) => [a.rid, a]));
  const pts = [];
  for (const rid of rids) {
    for (const p of panels) {
      const a = b.scales.repr[p.run].abilities.find((x) => x.rid === rid);
      if (!a) continue;
      pts.push({ x: p.mean_difficulty, y: a.p, label: '', color: famColor('repr', rid === 'pca_k128' ? 'PCA' : 'scVI'), tip: `<b>${esc(nameOf(b, rid))}</b> on ${esc(p.label)}<br>pass rate ${pct(a.p)} · panel mean difficulty ${sgn(p.mean_difficulty)}` });
    }
  }
  $('#how-acc').innerHTML = scatter(pts, { w: 520, h: 300, xlabel: 'panel mean difficulty on the pooled scale (logits)', ylabel: 'pass rate of the model on that panel', labels: false, ydom: [0.3, 1] }) + legend('repr', ['PCA', 'scVI']);
  const rng = (rid) => { const v = pts.filter((q) => q.color === famColor('repr', rid === 'pca_k128' ? 'PCA' : 'scVI')).map((q) => q.y); return [Math.min(...v), Math.max(...v)]; };
  const [l1, h1] = rng('pca_k128'), [l2, h2] = rng('scvi_k30_bnone');
  $('#how-acc-sub').textContent = `PCA-128D passes between ${pct(l1, 0)} and ${pct(h1, 0)} of the items depending on the panel, scVI-30D between ${pct(l2, 0)} and ${pct(h2, 0)}; on the pooled scale each is one ability, ${sgn(pooled.pca_k128.ability)} ± ${fmt(pooled.pca_k128.se)} and ${sgn(pooled.scvi_k30_bnone.ability)} ± ${fmt(pooled.scvi_k30_bnone.se)}. The spread is the test, not the model.`;
}
