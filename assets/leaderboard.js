import { $, $$, bench, board, legend, famOrder, familyOf, nameOf, int, sgn, fmt, pct, esc, view, allToggle, setAllModels } from './app.js';

export default async function leaderboard() {
  const b = await bench();
  let comp = 'repr', scaleId = 'pooled';
  const options = () => {
    if (comp === 'repr') {
      const panels = b.panels.map((p) => [p.run, p.label]);
      return [['pooled', 'Pooled scale, all 14 panels'], ...panels];
    }
    const screens = Object.entries(b.scales.pert).filter(([k]) => !k.startsWith('pooled')).map(([k, s]) => [k, s.label]);
    return [['pooled_context', 'Pooled, unseen combination (5 multi-context screens)'], ['pooled', 'Pooled, unseen perturbation (15 screens)'], ...screens.sort((p, q) => p[1].localeCompare(q[1]))];
  };
  const sel = $('#lb-scale');
  const fillSel = () => { sel.innerHTML = options().map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join(''); sel.value = scaleId; };

  // per-panel / per-screen detail for one model
  const detail = (a) => {
    const groups = comp === 'repr' ? b.panels.map((p) => ({ label: p.label, scale: b.scales.repr[p.run] })) : Object.entries(b.scales.pert).filter(([k]) => !k.startsWith('pooled')).map(([k, s]) => ({ label: s.label, scale: s }));
    const rows = groups.map((g) => { const r = g.scale.abilities.find((x) => x.rid === a.rid); return r ? { ...g, r, rank: g.scale.abilities.indexOf(r) + 1, of: g.scale.abilities.length } : null; }).filter(Boolean);
    const vals = rows.map((x) => x.r.ability), lo = Math.min(0, ...vals), hi = Math.max(0, ...vals, 0.01), x = (v) => (100 * (v - lo)) / (hi - lo);
    return `<div class="bdetail"><h4>${esc(nameOf(b, a.rid))} <span class="chip">${esc(familyOf(b, a.rid))}</span> <span class="faint small mono">${esc(a.rid)}</span></h4>
      <div class="stats"><span>ability <b>${sgn(a.ability)} ± ${fmt(a.se)}</b></span><span>pass rate <b>${pct(a.p, 1)}</b></span><span>outfit <b>${fmt(a.outfit)}</b></span><span>items <b>${int(a.n_items)}</b></span></div>
      ${rows.length ? `<div class="minis">${rows.map((x) => `<div class="mini"><span class="lab" title="${esc(x.label)}">${esc(x.label)} <span class="faint">· rank ${x.rank}/${x.of}</span></span><span class="val">${sgn(x.r.ability)}</span><span class="bar-mini"><i style="--l:${Math.min(x(0), x(x.r.ability))}%;--w:${Math.abs(x(x.r.ability) - x(0))}%;--c:${x.r.ability < 0 ? 'var(--s0)' : 'var(--accent)'}"></i></span></div>`).join('')}</div><p class="note">Abilities here are each panel's or screen's own fit, not the pooled scale, so they are comparable down a column but not across models of different pools.</p>` : '<p class="note">This model was only run on the pooled scale.</p>'}</div>`;
  };

  const draw = () => {
    const full = comp === 'repr' ? b.scales.repr[scaleId] : b.scales.pert[scaleId];
    const scale = view(b, full);
    $('#lb-all').innerHTML = allToggle('lb-all-cb', full.abilities.length, view(b, full).abilities.length);
    $('#lb-all-cb').addEventListener('change', (e) => { setAllModels(e.target.checked); draw(); });
    board($('#lb-board'), b, comp, scale, { detail });
    const fams = famOrder(comp).filter((f) => scale.abilities.some((a) => familyOf(b, a.rid) === f));
    $('#lb-legend').innerHTML = legend(comp, fams);
    const sch = scale.scheme ? ` · ${b.scheme_label[scale.scheme]} split` : '';
    $('#lb-desc').textContent = `${full.abilities.length} models · ${int(scale.items)} items, ${int(scale.informative)} informative, ${int(scale.nobody)} passed by nobody${sch} · median item SE ${fmt(scale.median_se)}`;
  };
  $$('#lb-comp button').forEach((btn) => btn.addEventListener('click', () => { comp = btn.dataset.comp; scaleId = comp === 'repr' ? 'pooled' : 'pooled_context'; $$('#lb-comp button').forEach((x) => { x.classList.toggle('on', x === btn); x.setAttribute('aria-pressed', x === btn); }); fillSel(); draw(); }));
  sel.addEventListener('change', () => { scaleId = sel.value; draw(); });
  fillSel(); draw();
}
