'use strict';

const SEEN_KEY = 'birds.seen.v1';      // { speciesId: ISO timestamp }
const FAMILIES_KEY = 'birds.families.v1'; // { familyKey: ISO timestamp }
const TEAM_KEY = 'birds.team.v1';           // { name }
const COLLAPSED_KEY = 'birds.collapsed.v1'; // { groupKey: true }

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
};

const seen = load(SEEN_KEY);
const families = load(FAMILIES_KEY);
for (const k of Object.keys(families)) if (!k.startsWith('m:')) delete families[k];
const collapsed = load(COLLAPSED_KEY);

const toastEl = document.getElementById('toast');
const listEl = document.getElementById('list');
const countEl = document.getElementById('count');
const countLabelEl = document.querySelector('.count-label');
const searchEl = document.getElementById('search');
const emptyEl = document.getElementById('empty');

// Lowercase and strip diacritics so "zasis" finds "žąsis".
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

const rows = []; // { id, el, key }
const groups = []; // { el, parent, rows }

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

let toastTimer;
function hideToast() {
  clearTimeout(toastTimer);
  toastEl.hidden = true;
  toastEl.replaceChildren();
}
// Optional onUndo adds an "Atšaukti" button that reverts the change.
function toast(message, onUndo) {
  hideToast();
  toastEl.append(el('span', 'toast-text', message));
  if (onUndo) {
    const undo = el('button', 'toast-undo', 'Atšaukti');
    undo.type = 'button';
    undo.addEventListener('click', () => { hideToast(); onUndo(); });
    toastEl.append(undo);
  }
  toastEl.hidden = false;
  toastTimer = setTimeout(hideToast, onUndo ? 5000 : 2800);
}

function makeGroup(kind, key, label) {
  const wrap = el('section', `group ${kind}`);
  const head = el('div', 'group-head');
  const main = el('button', 'head-main');
  main.type = 'button';
  main.append(el('span', 'toggle'), el('span', 'group-title', label));
  head.append(main);
  const body = el('div', 'group-body');
  wrap.append(head, body);
  wrap.dataset.key = key;
  main.addEventListener('click', () => {
    if (collapsed[key]) delete collapsed[key]; else collapsed[key] = true;
    save(COLLAPSED_KEY, collapsed);
    applyCollapse(wrap);
  });
  applyCollapse(wrap);
  return { wrap, head, body };
}

function applyCollapse(wrap) {
  const open = !collapsed[wrap.dataset.key] || searchEl.value.trim() !== '';
  wrap.classList.toggle('open', open);
  wrap.querySelector(':scope > .group-head > .head-main').setAttribute('aria-expanded', String(open));
}

// A ticked Šeima counts as one and locks the species inside it (and vice versa).
function makeFamilyCheck(f, famKey, frows) {
  const b = el('button', 'fam-check');
  b.type = 'button';
  b.append(el('span', 'check'));
  b.setAttribute('aria-label', 'Pažymėti šeimą');
  // Row shown only in the "checked only" view so a ticked Šeima appears there too.
  const row = el('button', 'fam-row');
  row.type = 'button';
  row.append(el('span', 'names', f.wrap.querySelector('.group-title').textContent), el('span', 'check'));
  row.addEventListener('click', () => b.click());
  f.body.prepend(row);
  const render = () => {
    const on = !!families[famKey];
    b.classList.toggle('seen', on);
    row.classList.toggle('seen', on);
    f.wrap.classList.toggle('ticked', on);
    frows.forEach((r) => r.classList.toggle('locked', on));
  };
  b.addEventListener('click', () => {
    hideToast();
    if (families[famKey]) {
      const was = families[famKey];
      delete families[famKey];
      if (onlyChecked) {
        toast(`Pašalinta šeima: ${f.wrap.querySelector('.group-title').textContent}`, () => {
          families[famKey] = was;
          save(FAMILIES_KEY, families);
          render();
          updateCount();
        });
      }
    } else if (frows.some((r) => r.classList.contains('seen'))) {
      toast('Pirmiausia nuimkite šios šeimos rūšių žymes');
      return;
    } else {
      families[famKey] = new Date().toISOString();
    }
    save(FAMILIES_KEY, families);
    render();
    updateCount();
  });
  render();
  f.head.append(b);
}

function makeSpecies(sp, famKey) {
  const b = el('button', 'species');
  b.type = 'button';
  const names = el('span', 'names');
  names.append(el('span', 'lt', sp.lt), el('span', 'la', sp.la));
  b.append(names, el('span', 'check'));
  b.classList.toggle('seen', !!seen[sp.id]);
  b.addEventListener('click', () => {
    if (families[famKey]) {
      toast('Pažymėta visa šeima, todėl rūšių žymėti negalima');
      return;
    }
    hideToast();
    if (seen[sp.id]) {
      const was = seen[sp.id];
      delete seen[sp.id];
      if (onlyChecked) {
        toast(`Pašalinta: ${sp.lt}`, () => {
          seen[sp.id] = was;
          save(SEEN_KEY, seen);
          b.classList.add('seen');
          updateCount();
        });
      }
    } else {
      seen[sp.id] = new Date().toISOString();
    }
    save(SEEN_KEY, seen);
    b.classList.toggle('seen', !!seen[sp.id]);
    updateCount();
  });
  rows.push({ id: sp.id, el: b, text: norm(`${sp.lt} ${sp.la}`) });
  return b;
}

let speciesData = null;

function build(data) {
  speciesData = data;
  const sections = [
    { prefix: 'm', orders: data.main, divider: false },
    { prefix: 'x', orders: data.extra, divider: true },
  ];
  for (const sec of sections) {
    if (sec.divider) listEl.append(el('div', 'section-title'));
    for (const order of sec.orders) {
      const o = makeGroup('order', `${sec.prefix}:${order.name}`, titleCase(order.name));
      o.wrap.querySelector('.group-title').textContent = order.name;
      for (const fam of order.families) {
        const famKey = `${sec.prefix}:${order.name}:${fam.name}`;
        const f = makeGroup('family', famKey, fam.name);
        const frows = fam.species.map((sp) => makeSpecies(sp, famKey));
        if (sec.prefix === 'm') makeFamilyCheck(f, famKey, frows); // extra block: species only
        f.body.append(...frows);
        o.body.append(f.wrap);
        groups.push({ wrap: f.wrap, parent: o.wrap, rows: frows });
      }
      listEl.append(o.wrap);
    }
  }
}

// Lithuanian plural: 1, 21 → one · 2-9, 22-29 → few · 0, 10-20, 30… → many
function plural(n, one, few, many) {
  const last = n % 10;
  if (n % 100 >= 10 && n % 100 <= 20 || last === 0) return many;
  return last === 1 ? one : few;
}
const speciesWord = (n) => plural(n, 'Rūšis', 'Rūšys', 'Rūšių');

function updateCount() {
  const total = Object.keys(seen).length + Object.keys(families).length;
  countEl.textContent = total;
  countLabelEl.textContent = speciesWord(total);
  refreshEmpty();
  updateSendInfo();
}

// Tapping the counter shows only the ticked species (and ticked Šeimos).
let onlyChecked = false;
let mainScroll = 0;
const countBtn = document.getElementById('countBtn');
countBtn.addEventListener('click', () => {
  hideToast();
  if (!onlyChecked) mainScroll = window.scrollY; // remember place in the full list
  if (!onlyChecked && searchEl.value) { searchEl.value = ''; applySearch(); } // search bar is hidden in this mode
  onlyChecked = !onlyChecked;
  listEl.classList.toggle('only-checked', onlyChecked);
  document.body.classList.toggle('checked-mode', onlyChecked);
  countBtn.classList.toggle('active', onlyChecked);
  countBtn.setAttribute('aria-pressed', String(onlyChecked));
  refreshEmpty();
  updateSendInfo();
  window.scrollTo(0, onlyChecked ? 0 : mainScroll);
});

let searchEmpty = false;
function refreshEmpty() {
  const nothingChecked = onlyChecked && searchEl.value.trim() === '' &&
    Object.keys(seen).length + Object.keys(families).length === 0;
  emptyEl.textContent = nothingChecked ? 'Dar nieko nepažymėta' : 'Nieko nerasta';
  emptyEl.hidden = !(searchEmpty || nothingChecked);
}

function applySearch() {
  const q = norm(searchEl.value.trim());
  let any = false;
  const orderHits = new Map();
  for (const r of rows) r.el.hidden = q !== '' && !r.text.includes(q);
  for (const g of groups) {
    const hit = g.rows.some((e) => !e.hidden);
    g.wrap.hidden = !hit;
    if (hit) orderHits.set(g.parent, true);
    if (hit) any = true;
  }
  for (const o of listEl.querySelectorAll('.order')) {
    o.hidden = q !== '' && !orderHits.has(o);
  }
  listEl.classList.toggle('searching', q !== '');
  document.querySelectorAll('.group').forEach(applyCollapse);
  searchEmpty = q !== '' && !any;
  refreshEmpty();
}

searchEl.addEventListener('input', applySearch);
// The phone keyboard's search/enter key closes the keyboard.
searchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); searchEl.blur(); }
});

// ---- Export: <Team>.zip with <Team>/<Team>.json and <Team>/<Team>.txt ----
const teamEl = document.getElementById('teamName');
const sendInfoEl = document.getElementById('sendInfo');
teamEl.value = load(TEAM_KEY).name || '';
teamEl.addEventListener('input', () => save(TEAM_KEY, { name: teamEl.value }));
teamEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); teamEl.blur(); }
});

function updateSendInfo() {
  const ns = Object.keys(seen).length;
  const nf = Object.keys(families).length;
  let text = `${ns} ${speciesWord(ns).toLowerCase()}`;
  if (nf) text += ` · ${nf} ${plural(nf, 'šeima', 'šeimos', 'šeimų')}`;
  sendInfoEl.textContent = text;
}

// Name used for the folder and files: no characters that are illegal in file names.
function safeName(name) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '').slice(0, 60);
}

function pad(n) { return String(n).padStart(2, '0'); }

function buildExport(team, now) {
  const jsonSpecies = [];
  const jsonFamilies = [];
  const lines = [];
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const nSeen = Object.keys(seen).length;
  const nFam = Object.keys(families).length;
  lines.push(`Komanda: ${team}`, `Data: ${stamp}`,
    `Iš viso: ${nSeen + nFam} ${speciesWord(nSeen + nFam).toLowerCase()}` +
      (nFam ? ` (${nSeen} ${speciesWord(nSeen).toLowerCase()} ir ${nFam} ${plural(nFam, 'šeima', 'šeimos', 'šeimų')})` : ''), '');

  const blocks = [{ prefix: 'm', orders: speciesData.main, title: null },
                  { prefix: 'x', orders: speciesData.extra, title: 'PAPILDOMAS SĄRAŠAS' }];
  for (const blk of blocks) {
    let titled = false;
    for (const order of blk.orders) {
      let orderLine = false;
      for (const fam of order.families) {
        const famKey = `${blk.prefix}:${order.name}:${fam.name}`;
        const famOn = !!families[famKey];
        const sps = fam.species.filter((sp) => seen[sp.id]);
        if (!famOn && !sps.length) continue;
        if (blk.title && !titled) { lines.push(blk.title, ''); titled = true; }
        if (!orderLine) { lines.push(order.name); orderLine = true; }
        if (famOn) {
          jsonFamilies.push({ key: famKey, seenAt: families[famKey] });
          lines.push(`  ${fam.name} – pažymėta visa šeima`);
        } else {
          lines.push(`  ${fam.name}`);
          for (const sp of sps) {
            jsonSpecies.push({ id: sp.id, seenAt: seen[sp.id] });
            lines.push(`    ${sp.id}. ${sp.lt} (${sp.la})`);
          }
        }
      }
      if (orderLine) lines.push('');
    }
  }
  const json = { version: 1, teamName: team, exportedAt: now.toISOString(), species: jsonSpecies, families: jsonFamilies };
  return { json, text: lines.join('\r\n') };
}

function makeExportFile() {
  const team = safeName(teamEl.value);
  if (!team) { toast('Įveskite komandos pavadinimą'); teamEl.focus(); return null; }
  if (Object.keys(seen).length + Object.keys(families).length === 0) { toast('Nieko nepažymėta'); return null; }
  const now = new Date();
  const { json, text } = buildExport(team, now);
  const enc = new TextEncoder();
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]); // so Lithuanian letters open correctly in Notepad/Excel
  const txt = enc.encode(text);
  const txtBytes = new Uint8Array(bom.length + txt.length);
  txtBytes.set(bom); txtBytes.set(txt, bom.length);
  const blob = Zip.create([
    { name: `${team}/${team}.json`, data: enc.encode(JSON.stringify(json, null, 1)) },
    { name: `${team}/${team}.txt`, data: txtBytes },
  ], now);
  return { blob, fileName: `${team}.zip` };
}

function download({ blob, fileName }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

document.getElementById('downloadBtn').addEventListener('click', () => {
  const file = makeExportFile();
  if (!file) return;
  download(file);
  toast(`Failas išsaugotas: ${file.fileName}`);
});

document.getElementById('shareBtn').addEventListener('click', async () => {
  const file = makeExportFile();
  if (!file) return;
  const shareFile = new File([file.blob], file.fileName, { type: 'application/zip' });
  if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
    try {
      await navigator.share({ files: [shareFile], title: file.fileName });
    } catch (e) {
      if (e.name !== 'AbortError') { download(file); toast('Nepavyko pasidalinti – failas išsaugotas'); }
    }
  } else {
    download(file);
    toast('Dalinimasis nepalaikomas – failas išsaugotas');
  }
});

// Offline support: the service worker caches the app after the first visit.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

// Scroll-to-top button, shown once the list has been scrolled a bit.
const toTopEl = document.getElementById('toTop');
window.addEventListener('scroll', () => { toTopEl.hidden = window.scrollY < 400; }, { passive: true });
toTopEl.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

fetch('data/species.json')
  .then((r) => r.json())
  .then((data) => {
    build(data);
    updateCount();
    applySearch();
  });
