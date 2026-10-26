import { $, $$, bench, getJSON, int, sgn, fmt, pct, esc } from './app.js';

const PAGE = 50;

export default async function items() {
  const b = await bench();
  const reprRows = await getJSON('data/items_repr.json');
  const panelLabel = Object.fromEntries(b.panels.map((p) => [p.run, p.label]));
  const screenName = Object.fromEntries(b.screens.map((s) => [s.dataset, s.name]));
  let comp = 'repr', group = 'all', scheme = 'perturbation', q = '', sortKey = 'difficulty', sortAsc = false, page = 0;
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash && panelLabel[hash]) group = hash;
  if (hash && screenName[hash]) { comp = 'pert'; group = hash; }

  const COLS = {
    repr: [['type', 'Cell type', false], ['panel', 'Panel', false], ['compartment', 'Compartment', false], ['n', 'Items', true], ['difficulty', 'Difficulty', true], ['se', '± SE', true], ['pass_rate', 'Pass rate', true], ['nobody', 'Nobody passes', true], ['support', 'Train cells', true]],
    pert: [['perturbation', 'Perturbation', false], ['context', 'Context', false], ['dose', 'Dose', true], ['difficulty', 'Difficulty', true], ['se', '± SE', true], ['p_correct', 'Pass rate', true], ['n_cells', 'Cells', true], ['delta_l2', 'Effect size', true], ['n_resp_genes', 'Responding genes', true], ['cos_generic', 'Cosine to mean shift', true], ['bin', 'Response bin', false]],
  };
  const groupSel = $('#it-group'), schemeSel = $('#it-scheme');
  const fillGroups = () => {
    groupSel.innerHTML = comp === 'repr' ? `<option value="all">All panels</option>` + b.panels.map((p) => `<option value="${p.run}">${esc(p.label)}</option>`).join('') : b.screens.map((s) => `<option value="${s.dataset}">${esc(s.name)}</option>`).join('');
    if (comp === 'pert' && !screenName[group]) group = b.screens[0].dataset;
    if (comp === 'repr' && group !== 'all' && !panelLabel[group]) group = 'all';
    groupSel.value = group;
    schemeSel.hidden = comp !== 'pert';
  };
  const fillSchemes = (s) => { schemeSel.innerHTML = s.schemes.map((k) => `<option value="${k}">${esc(b.scheme_label[k])}</option>`).join(''); if (!s.schemes.includes(scheme)) scheme = s.schemes[0]; schemeSel.value = scheme; };

  let rows = [];
  async function load() {
    if (comp === 'repr') {
      rows = (group === 'all' ? reprRows : reprRows.filter((r) => r.panel === group)).map((r) => ({ ...r, panelLabel: panelLabel[r.panel] }));
      $('#it-note').textContent = 'Cell-level items aggregated to (panel, cell type): difficulty is the mean over the type\'s informative cells, SE is the standard error of that mean. Types with fewer than five items are omitted.';
    } else {
      const s = b.screens.find((x) => x.dataset === group);
      fillSchemes(s);
      const f = await getJSON(`data/items/${group}.json`);
      const cols = f.columns;
      rows = f.schemes[scheme].map((a) => Object.fromEntries(cols.map((c, i) => [c, a[i]])));
      $('#it-note').textContent = `${s.name}: one row per condition, difficulties on the pooled ${b.scheme_label[scheme]} scale. Effect size is the L2 norm of the measured pseudobulk delta; responding genes, cosine to the context mean shift and the response bin come from the anatomy analysis. Items passed by nobody have no finite difficulty on this pool and are listed with pass rate 0.`;
    }
  }
  const matches = (r) => { if (!q) return true; const s = q.toLowerCase(); return Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(s)); };
  function draw() {
    const cols = COLS[comp];
    let d = rows.filter(matches);
    const dir = sortAsc ? 1 : -1;
    d.sort((p, r) => { const a = p[sortKey], c = r[sortKey]; if (a == null && c == null) return 0; if (a == null) return 1; if (c == null) return -1; return (typeof a === 'number' ? a - c : String(a).localeCompare(String(c))) * dir; });
    const n = d.length, pages = Math.max(1, Math.ceil(n / PAGE)); page = Math.min(page, pages - 1);
    const slice = d.slice(page * PAGE, (page + 1) * PAGE);
    const cell = (r, k, num) => {
      const v = r[k];
      if (k === 'panel') return esc(r.panelLabel || v);
      if (k === 'difficulty' || k === 'se') return v == null ? '–' : (k === 'difficulty' ? sgn(v) : fmt(v));
      if (k === 'pass_rate' || k === 'nobody' || k === 'p_correct') return pct(v, 0);
      if (k === 'n' || k === 'support' || k === 'n_cells') return int(v);
      if (k === 'delta_l2' || k === 'dose' || k === 'cos_generic') return v == null ? '–' : fmt(v, 2);
      if (k === 'n_resp_genes') return v == null ? '–' : int(v);
      if (k === 'bin') return v == null ? '–' : esc(String(v).replace('_', ' '));
      return esc(v ?? '–');
    };
    $('#it-table').innerHTML = `<thead><tr>${cols.map(([k, l, num]) => `<th class="sortable${num ? ' num' : ''}${k === sortKey ? ' sorted' + (sortAsc ? ' asc' : '') : ''}" data-k="${k}">${l}</th>`).join('')}</tr></thead>
      <tbody>${slice.map((r) => `<tr>${cols.map(([k, , num]) => `<td class="${num ? 'num' : ''}">${cell(r, k, num)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}" class="faint">No items match.</td></tr>`}</tbody>`;
    $$('th.sortable', $('#it-table')).forEach((th) => th.addEventListener('click', () => { if (sortKey === th.dataset.k) sortAsc = !sortAsc; else { sortKey = th.dataset.k; sortAsc = !COLS[comp].find((c) => c[0] === sortKey)[2]; } draw(); }));
    $('#it-count').textContent = `${int(n)} rows`;
    $('#it-pager').innerHTML = `<button type="button" id="pg-prev" ${page === 0 ? 'disabled' : ''}>← previous</button><span>page ${page + 1} of ${pages}</span><button type="button" id="pg-next" ${page >= pages - 1 ? 'disabled' : ''}>next →</button>`;
    $('#pg-prev').addEventListener('click', () => { page--; draw(); });
    $('#pg-next').addEventListener('click', () => { page++; draw(); });
  }
  const reload = async () => { page = 0; await load(); draw(); };
  $$('#it-comp button').forEach((btn) => btn.addEventListener('click', () => { comp = btn.dataset.comp; sortKey = 'difficulty'; sortAsc = false; $$('#it-comp button').forEach((x) => { x.classList.toggle('on', x === btn); x.setAttribute('aria-pressed', x === btn); }); fillGroups(); reload(); }));
  groupSel.addEventListener('change', () => { group = groupSel.value; reload(); });
  schemeSel.addEventListener('change', () => { scheme = schemeSel.value; reload(); });
  $('#it-q').addEventListener('input', (e) => { q = e.target.value.trim(); page = 0; draw(); });
  $$('#it-comp button').forEach((x) => { x.classList.toggle('on', x.dataset.comp === comp); x.setAttribute('aria-pressed', x.dataset.comp === comp); });
  fillGroups(); await reload();
}
