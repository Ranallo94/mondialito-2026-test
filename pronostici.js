/**
 * MONDIALITO 2026 — pronostici.js
 */

import DB from '../mondialito_db.json' with { type: 'json' };
import { STATE } from './app.js';
import { getPronostici, savePronostici, onSistemaSnapshot } from './db.js';
import { showToast, showSpinner } from './ui.js';

let _pronostici = {};
let _sistemaUnsub = null;
let _pronosticiAperti = true;

export async function initPronostici() {
  showSpinner('gironi-container', 'Caricamento pronostici...');
  _sistemaUnsub = onSistemaSnapshot((cfg) => {
    _pronosticiAperti = cfg.pronostici_aperti !== false;
    _aggiornaStatoBanner();
    _aggiornaBtnSalva();
  });
  try {
    const saved = await getPronostici(STATE.utente.id);
    _pronostici = saved || {};
  } catch (e) {
    _pronostici = {};
  }
  _renderGironi();
  _renderEliminatoria();
  _renderSpeciali();
  Object.keys(DB.gironi).forEach(l => _ricalcolaClassificaGirone(l));
  document.getElementById('form-pronostici').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!_pronosticiAperti) { showToast('I pronostici sono chiusi!', 'error'); return; }
    await _salvaPronostici();
  });
}

function _aggiornaStatoBanner() {
  const banner = document.getElementById('pronostici-banner');
  const status = document.getElementById('pronostici-status');
  if (_pronosticiAperti) {
    banner.style.display = 'none';
    status.textContent = '✅ Pronostici aperti';
    status.style.color = 'var(--verde-light)';
  } else {
    banner.style.display = '';
    banner.className = 'info-banner info-banner--red';
    banner.innerHTML = '<span>🔒</span><span>I pronostici sono <strong>chiusi</strong>.</span>';
    status.textContent = '🔒 Pronostici chiusi';
    status.style.color = 'var(--oro)';
  }
}

function _aggiornaBtnSalva() {
  const btn = document.getElementById('btn-salva-pronostici');
  if (btn) btn.disabled = !_pronosticiAperti;
}

function _renderGironi() {
  const container = document.getElementById('gironi-container');
  let html = '';
  Object.entries(DB.gironi).forEach(([lettera, girone]) => {
    html += '<div class="girone-block">'
      + '<div class="girone-header">'
      + '<h3 class="girone-title">Girone ' + lettera + '</h3>'
      + '<div class="girone-squadre">'
      + girone.squadre.map(id => {
          const sq = DB.squadre[id];
          return '<span class="team-chip">' + (sq?.flag||'') + ' ' + (sq?.nome||id) + '</span>';
        }).join('')
      + '</div></div>'
      + '<div class="partite-list">'
      + girone.partite.map(p => _renderPartitaGirone(p)).join('')
      + '</div>'
      + '<div class="girone-classifica-mini" id="classifica-girone-' + lettera + '"></div>'
      + '</div>';
  });
  container.innerHTML = html;
  _bindSegniGirone();
}

function _renderPartitaGirone(p) {
  const casa      = DB.squadre[p.casa];
  const trasferta = DB.squadre[p.trasferta];
  const saved     = _pronostici?.gironi?.[p.id] || {};
  const golCasa   = saved.gol_casa ?? '';
  const golTrasf  = saved.gol_trasferta ?? '';
  const segnoCurr = saved.segno || '';
  const dateLabel = p.data ? '<span class="match-date">' + _fmtData(p.data) + '</span>' : '';
  return '<div class="partita-row" data-id="' + p.id + '">'
    + '<div class="partita-meta">' + dateLabel + ' <span class="match-group-label">Girone ' + p.girone + '</span></div>'
    + '<div class="partita-main">'
    + '<div class="team-name team-home">' + (casa?.flag||'') + ' ' + (casa?.nome||p.casa) + '</div>'
    + '<div class="match-center">'
    + '<div class="segni-group">'
    + ['1','X','2'].map(s => '<button type="button" class="segno-btn' + (segnoCurr===s?' active':'') + '" data-match="' + p.id + '" data-segno="' + s + '">' + s + '</button>').join('')
    + '</div>'
    + '<div class="score-inputs">'
    + '<input type="number" class="score-input" min="0" max="20" name="gol_casa_' + p.id + '" value="' + golCasa + '" placeholder="0" data-match="' + p.id + '" data-field="gol_casa">'
    + '<span class="score-sep">:</span>'
    + '<input type="number" class="score-input" min="0" max="20" name="gol_trasf_' + p.id + '" value="' + golTrasf + '" placeholder="0" data-match="' + p.id + '" data-field="gol_trasferta">'
    + '</div></div>'
    + '<div class="team-name team-away">' + (trasferta?.flag||'') + ' ' + (trasferta?.nome||p.trasferta) + '</div>'
    + '</div></div>';
}

function _bindSegniGirone() {
  document.querySelectorAll('.segno-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const matchId = btn.dataset.match;
      document.querySelectorAll('.segno-btn[data-match="' + matchId + '"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (!_pronostici.gironi) _pronostici.gironi = {};
      if (!_pronostici.gironi[matchId]) _pronostici.gironi[matchId] = {};
      _pronostici.gironi[matchId].segno = btn.dataset.segno;
    });
  });
  document.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('input', () => {
      const matchId = input.dataset.match;
      const val = parseInt(input.value);
      if (!_pronostici.gironi) _pronostici.gironi = {};
      if (!_pronostici.gironi[matchId]) _pronostici.gironi[matchId] = {};
      _pronostici.gironi[matchId][input.dataset.field] = isNaN(val) ? null : val;
      const gc = _pronostici.gironi[matchId].gol_casa;
      const gt = _pronostici.gironi[matchId].gol_trasferta;
      if (gc != null && gt != null) {
        const s = gc > gt ? '1' : gc < gt ? '2' : 'X';
        _pronostici.gironi[matchId].segno = s;
        document.querySelectorAll('.segno-btn[data-match="' + matchId + '"]').forEach(b => b.classList.toggle('active', b.dataset.segno === s));
      }
      const lettera = _getGironeByMatchId(matchId);
      if (lettera) _ricalcolaClassificaGirone(lettera);
    });
  });
}

const FASI_ELIM = [
  { id: 'sedicesimi', label: 'Sedicesimi di finale' },
  { id: 'ottavi',     label: 'Ottavi di finale' },
  { id: 'quarti',     label: 'Quarti di finale' },
  { id: 'semifinali', label: 'Semifinali' },
  { id: 'finale',     label: 'Finale' },
];

function _getMatchesFase(id) {
  if (id === 'finale') {
    const p = DB.fase_eliminatoria?.finale?.partita || {};
    return p.casa || p.trasferta ? [{ id: 'F', ...p }] : [];
  }
  const fase = DB.fase_eliminatoria?.[id]?.partite || {};
  return Object.entries(fase).map(([mid, p]) => ({ id: mid, ...p }));
}

function _renderEliminatoria() {
  const container = document.getElementById('eliminatoria-container');
  let html = '';
  FASI_ELIM.forEach(({ id, label }) => {
    const matches = _getMatchesFase(id);
    if (!matches.length) return;
    html += '<div class="fase-block"><h3 class="fase-title">' + label + '</h3><div class="fase-matches">';
    matches.forEach(m => { html += _renderMatchElim(id, m); });
    html += '</div></div>';
  });
  container.innerHTML = html || '<p>Il bracket sarà disponibile al termine dei gironi.</p>';
  _bindEliminatoria();
}

function _renderMatchElim(faseId, match) {
  const saved    = _pronostici?.fase_eliminatoria?.[faseId]?.[match.id] || {};
  const vincSaved = saved.vincitore || '';
  const modSaved  = saved.modalita  || '';
  const sqOpts = Object.entries(DB.squadre)
    .map(([id, sq]) => '<option value="' + id + '"' + (vincSaved===id?' selected':'') + '>' + (sq.flag||'') + ' ' + sq.nome + '</option>')
    .join('');
  const modHtml = [['90min',"90'"],['supplementari','Suppl.'],['rigori','Rigori']].map(([v,l]) =>
    '<button type="button" class="modalita-btn' + (modSaved===v?' active':'') + '" data-fase="' + faseId + '" data-match="' + match.id + '" data-mod="' + v + '">' + l + '</button>'
  ).join('');
  const casaLabel  = match.casa      ? (DB.squadre[match.casa]?.nome      || match.casa)      : '?';
  const trasfLabel = match.trasferta ? (DB.squadre[match.trasferta]?.nome  || match.trasferta) : '?';
  const casaFlag   = match.casa      ? (DB.squadre[match.casa]?.flag      || '') : '';
  const trasfFlag  = match.trasferta ? (DB.squadre[match.trasferta]?.flag  || '') : '';
  return '<div class="elim-match-card" data-fase="' + faseId + '" data-id="' + match.id + '">'
    + '<div class="elim-matchup"><span class="elim-team">' + casaFlag + ' ' + casaLabel + '</span><span class="elim-vs">vs</span><span class="elim-team">' + trasfFlag + ' ' + trasfLabel + '</span></div>'
    + '<div class="elim-pick"><label class="field-label-sm">Chi passa?</label>'
    + '<select class="field-input field-input-sm vincitore-select" data-fase="' + faseId + '" data-match="' + match.id + '"><option value="">— Seleziona —</option>' + sqOpts + '</select></div>'
    + '<div class="elim-modalita"><label class="field-label-sm">Come?</label><div class="modalita-group">' + modHtml + '</div></div></div>';
}

function _bindEliminatoria() {
  document.querySelectorAll('.vincitore-select').forEach(sel => {
    sel.addEventListener('change', () => _setElim(sel.dataset.fase, sel.dataset.match, 'vincitore', sel.value || null));
  });
  document.querySelectorAll('.modalita-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modalita-btn[data-fase="' + btn.dataset.fase + '"][data-match="' + btn.dataset.match + '"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _setElim(btn.dataset.fase, btn.dataset.match, 'modalita', btn.dataset.mod);
    });
  });
}

function _setElim(faseId, matchId, field, value) {
  if (!_pronostici.fase_eliminatoria) _pronostici.fase_eliminatoria = {};
  if (!_pronostici.fase_eliminatoria[faseId]) _pronostici.fase_eliminatoria[faseId] = {};
  if (!_pronostici.fase_eliminatoria[faseId][matchId]) _pronostici.fase_eliminatoria[faseId][matchId] = {};
  _pronostici.fase_eliminatoria[faseId][matchId][field] = value;
}

function _renderSpeciali() {
  const container = document.getElementById('speciali-container');
  const pCannon = _pronostici?.capocannoniere || {};
  let html = '<div class="speciali-section"><h3 class="section-title">🥇 Capocannoniere</h3>'
    + '<p class="section-desc">Pronostica i <strong>3 migliori marcatori</strong> in ordine. 1° → 40pt, 2° → 20pt, 3° → 10pt. Bonus +10 nella terna.</p>'
    + '<div class="cannon-inputs">';
  ['primo','secondo','terzo'].forEach((key, i) => {
    html += '<div class="field-group"><label class="field-label">' + (i+1) + '° Capocannoniere</label>'
      + '<input type="text" class="field-input" id="cannon-' + key + '" value="' + (pCannon[key]||'') + '" placeholder="es. Mbappé" autocomplete="off"></div>';
  });
  html += '</div></div>'
    + '<div class="speciali-section"><h3 class="section-title">📊 Posizioni finali nei gironi</h3>'
    + '<p class="section-desc">Le posizioni si aggiornano automaticamente dai risultati. <strong>10pt</strong> per ogni posizione corretta (solo squadre ai sedicesimi).</p>'
    + '<div class="gironi-posiz-grid" id="gironi-posiz-container">'
    + _renderPosizioniGironi()
    + '</div></div>';
  container.innerHTML = html;
  _bindSpeciali();
}

function _renderPosizioniGironi() {
  let html = '';
  Object.entries(DB.gironi).forEach(([lettera, girone]) => {
    const savedPosiz = _pronostici?.posizioni_girone?.[lettera] || [];
    html += '<div class="girone-posiz-card"><div class="girone-posiz-header">Girone ' + lettera + '</div><div class="posiz-slots" data-girone="' + lettera + '">';
    [0,1,2,3].forEach(i => {
      const currId = savedPosiz[i] || '';
      const opts = girone.squadre.map(id => {
        const sq = DB.squadre[id];
        return '<option value="' + id + '"' + (currId===id?' selected':'') + '>' + (sq?.flag||'') + ' ' + (sq?.nome||id) + '</option>';
      }).join('');
      html += '<div class="posiz-slot"><span class="posiz-num">' + (i+1) + '°</span>'
        + '<select class="field-input field-input-sm posiz-select" data-girone="' + lettera + '" data-pos="' + i + '"><option value="">—</option>' + opts + '</select></div>';
    });
    html += '</div></div>';
  });
  return html;
}

function _bindSpeciali() {
  ['primo','secondo','terzo'].forEach(key => {
    const input = document.getElementById('cannon-' + key);
    if (!input) return;
    input.addEventListener('input', () => {
      if (!_pronostici.capocannoniere) _pronostici.capocannoniere = {};
      _pronostici.capocannoniere[key] = input.value.trim() || null;
    });
  });
  document.querySelectorAll('.posiz-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const lettera = sel.dataset.girone;
      const pos = parseInt(sel.dataset.pos);
      if (!_pronostici.posizioni_girone) _pronostici.posizioni_girone = {};
      if (!_pronostici.posizioni_girone[lettera]) _pronostici.posizioni_girone[lettera] = [];
      _pronostici.posizioni_girone[lettera][pos] = sel.value || null;
    });
  });
}

function _getGironeByMatchId(matchId) {
  for (const [lettera, girone] of Object.entries(DB.gironi)) {
    if (girone.partite.some(p => p.id === matchId)) return lettera;
  }
  return null;
}

function _ricalcolaClassificaGirone(lettera) {
  const girone = DB.gironi[lettera];
  if (!girone) return;
  const stats = {};
  girone.squadre.forEach(id => { stats[id] = { pt:0, gf:0, gs:0, gd:0, g:0 }; });
  girone.partite.forEach(p => {
    const pr = _pronostici?.gironi?.[p.id];
    const gc = pr?.gol_casa, gt = pr?.gol_trasferta;
    if (gc == null || gt == null) return;
    stats[p.casa].g++;       stats[p.trasferta].g++;
    stats[p.casa].gf += gc;  stats[p.casa].gs += gt;  stats[p.casa].gd += (gc-gt);
    stats[p.trasferta].gf += gt; stats[p.trasferta].gs += gc; stats[p.trasferta].gd += (gt-gc);
    if (gc > gt) stats[p.casa].pt += 3;
    else if (gc === gt) { stats[p.casa].pt++; stats[p.trasferta].pt++; }
    else stats[p.trasferta].pt += 3;
  });
  const cl = girone.squadre.map(id => ({ id, ...stats[id] }))
    .sort((a,b) => b.pt-a.pt || b.gd-a.gd || b.gf-a.gf);
  const hasData = cl.some(t => t.g > 0);
  const miniEl = document.getElementById('classifica-girone-' + lettera);
  if (miniEl) {
    if (!hasData) { miniEl.innerHTML = ''; return; }
    let rows = '';
    cl.forEach((t, i) => {
      const sq = DB.squadre[t.id];
      const gd = (t.gd > 0 ? '+' : '') + t.gd;
      const gdCls = t.gd > 0 ? 'gd-pos' : t.gd < 0 ? 'gd-neg' : '';
      rows += '<tr class="' + (i<2?'qualificata':'') + '">'
        + '<td class="mini-pos">' + (i+1) + '</td>'
        + '<td class="mini-team">' + (sq?.flag||'') + ' ' + (sq?.nome||t.id) + '</td>'
        + '<td class="mini-pt"><strong>' + t.pt + '</strong></td>'
        + '<td>' + t.g + '</td><td>' + t.gf + '</td><td>' + t.gs + '</td>'
        + '<td class="' + gdCls + '">' + gd + '</td></tr>';
    });
    miniEl.innerHTML = '<table class="girone-mini-table"><thead><tr><th>#</th><th>Squadra</th><th>Pt</th><th>G</th><th>GF</th><th>GS</th><th>GD</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  const slots = document.querySelector('.posiz-slots[data-girone="' + lettera + '"]');
  if (slots && hasData) {
    cl.forEach((team, i) => {
      const sel = slots.querySelector('.posiz-select[data-pos="' + i + '"]');
      if (sel) {
        sel.value = team.id;
        if (!_pronostici.posizioni_girone) _pronostici.posizioni_girone = {};
        if (!_pronostici.posizioni_girone[lettera]) _pronostici.posizioni_girone[lettera] = [];
        _pronostici.posizioni_girone[lettera][i] = team.id;
      }
    });
  }
}

async function _salvaPronostici() {
  const btn = document.getElementById('btn-salva-pronostici');
  const msg = document.getElementById('pronostici-save-msg');
  btn.disabled = true;
  btn.textContent = 'Salvataggio...';
  try {
    _raccogliDalDOM();
    await savePronostici(STATE.utente.id, _pronostici);
    showToast('Pronostici salvati!', 'success');
    msg.textContent = 'Salvato il ' + new Date().toLocaleString('it-IT');
    msg.className = 'save-message save-ok';
    msg.style.display = '';
  } catch (e) {
    showToast('Errore nel salvataggio. Riprova.', 'error');
    msg.textContent = 'Errore.';
    msg.className = 'save-message save-error';
    msg.style.display = '';
  } finally {
    btn.disabled = !_pronosticiAperti;
    btn.textContent = 'Salva i miei pronostici';
  }
}

function _raccogliDalDOM() {
  document.querySelectorAll('.score-input').forEach(input => {
    const val = parseInt(input.value);
    if (!_pronostici.gironi) _pronostici.gironi = {};
    if (!_pronostici.gironi[input.dataset.match]) _pronostici.gironi[input.dataset.match] = {};
    _pronostici.gironi[input.dataset.match][input.dataset.field] = isNaN(val) ? null : val;
  });
  ['primo','secondo','terzo'].forEach(key => {
    const input = document.getElementById('cannon-' + key);
    if (!input) return;
    if (!_pronostici.capocannoniere) _pronostici.capocannoniere = {};
    _pronostici.capocannoniere[key] = input.value.trim() || null;
  });
}

function _fmtData(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Rome' });
  } catch { return iso; }
}
