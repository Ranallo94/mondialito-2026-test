/**
 * MONDIALITO 2026 — pronostici.js
 * Genera il form pronostici dinamicamente da mondialito_db.json.
 * Gestisce: 72 partite girone, posizioni finali girone,
 *           bracket eliminatoria con modalità, capocannonieri.
 */

import DB from '../mondialito_db.json' with { type: 'json' };
import { STATE } from './app.js';
import { getPronostici, savePronostici, getSistema, onSistemaSnapshot } from './db.js';
import { showToast, showSpinner } from './ui.js';

let _pronostici = {};       // scheda corrente (in memoria)
let _sistemaUnsub = null;   // unsubscribe sistema snapshot
let _pronosticiAperti = true;

// ── INIT ──────────────────────────────────────────────
export async function initPronostici() {
  showSpinner('gironi-container', 'Caricamento pronostici…');

  // Ascolta stato sistema (aperto/chiuso)
  _sistemaUnsub = onSistemaSnapshot((cfg) => {
    _pronosticiAperti = cfg.pronostici_aperti !== false;
    _aggiornaStatoBanner();
    _aggiornaBtnSalva();
  });

  // Carica pronostici esistenti
  try {
    const saved = await getPronostici(STATE.utente.id);
    _pronostici = saved || {};
  } catch (e) {
    console.warn('Errore caricamento pronostici:', e);
    _pronostici = {};
  }

  // Genera form
  _renderGironi();
  _renderEliminatoria();
  _renderSpeciali();

  // Gestione submit
  document.getElementById('form-pronostici').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!_pronosticiAperti) {
      showToast('I pronostici sono chiusi!', 'error');
      return;
    }
    await _salvaPronostici();
  });
}

// ── STATO BANNER ──────────────────────────────────────
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
    banner.innerHTML = '<span>🔒</span><span>I pronostici sono <strong>chiusi</strong>. Il torneo è iniziato.</span>';
    status.textContent = '🔒 Pronostici chiusi';
    status.style.color = 'var(--oro)';
  }
}

function _aggiornaBtnSalva() {
  const btn = document.getElementById('btn-salva-pronostici');
  if (btn) btn.disabled = !_pronosticiAperti;
}

// ── TAB 1: GIRONI ─────────────────────────────────────
function _renderGironi() {
  const container = document.getElementById('gironi-container');
  let html = '';

  Object.entries(DB.gironi).forEach(([lettera, girone]) => {
    html += `
      <div class="girone-block">
        <div class="girone-header">
          <h3 class="girone-title">Girone ${lettera}</h3>
          <div class="girone-squadre">
            ${girone.squadre.map(id => {
              const sq = DB.squadre[id];
              return `<span class="team-chip">${sq?.flag || ''} ${sq?.nome || id}</span>`;
            }).join('')}
          </div>
        </div>
        <div class="partite-list">
          ${girone.partite.map(p => _renderPartitaGirone(p)).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html;
  _bindSegniGirone();
}

function _renderPartitaGirone(p) {
  const casa      = DB.squadre[p.casa];
  const trasferta = DB.squadre[p.trasferta];
  const saved     = _pronostici?.gironi?.[p.id] || {};

  const golCasa    = saved.gol_casa    ?? '';
  const golTrasf   = saved.gol_trasferta ?? '';
  const segnoCurr  = saved.segno || '';

  const dateLabel = p.data
    ? `<span class="match-date">${_fmtData(p.data)}</span>`
    : '';

  return `
    <div class="partita-row" data-id="${p.id}">
      <div class="partita-meta">${dateLabel} <span class="match-group-label">Girone ${p.girone}</span></div>
      <div class="partita-main">
        <div class="team-name team-home">${casa?.flag || ''} ${casa?.nome || p.casa}</div>
        <div class="match-center">
          <div class="segni-group">
            <button type="button" class="segno-btn${segnoCurr === '1' ? ' active' : ''}" data-match="${p.id}" data-segno="1">1</button>
            <button type="button" class="segno-btn${segnoCurr === 'X' ? ' active' : ''}" data-match="${p.id}" data-segno="X">X</button>
            <button type="button" class="segno-btn${segnoCurr === '2' ? ' active' : ''}" data-match="${p.id}" data-segno="2">2</button>
          </div>
          <div class="score-inputs">
            <input type="number" class="score-input" min="0" max="20"
              name="gol_casa_${p.id}" value="${golCasa}"
              placeholder="0" data-match="${p.id}" data-field="gol_casa">
            <span class="score-sep">:</span>
            <input type="number" class="score-input" min="0" max="20"
              name="gol_trasf_${p.id}" value="${golTrasf}"
              placeholder="0" data-match="${p.id}" data-field="gol_trasferta">
          </div>
        </div>
        <div class="team-name team-away">${trasferta?.flag || ''} ${trasferta?.nome || p.trasferta}</div>
      </div>
    </div>`;
}

function _bindSegniGirone() {
  document.querySelectorAll('.segno-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const matchId = btn.dataset.match;
      const segno   = btn.dataset.segno;

      // Rimuovi active dagli altri segni dello stesso match
      document.querySelectorAll(`.segno-btn[data-match="${matchId}"]`).forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      // Aggiorna stato in memoria
      if (!_pronostici.gironi) _pronostici.gironi = {};
      if (!_pronostici.gironi[matchId]) _pronostici.gironi[matchId] = {};
      _pronostici.gironi[matchId].segno = segno;

      // Auto-compila il segno in base ai gol se già inseriti
      _syncSegnoFromScore(matchId);
    });
  });

  // Sync segno quando si cambiano i gol
  document.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('input', () => {
      const matchId = input.dataset.match;
      const field   = input.dataset.field;
      const val     = parseInt(input.value);

      if (!_pronostici.gironi) _pronostici.gironi = {};
      if (!_pronostici.gironi[matchId]) _pronostici.gironi[matchId] = {};
      _pronostici.gironi[matchId][field] = isNaN(val) ? null : val;

      // Se entrambi i gol presenti, aggiorna il segno automaticamente
      const gc = _pronostici.gironi[matchId].gol_casa;
      const gt = _pronostici.gironi[matchId].gol_trasferta;
      if (gc != null && gt != null) {
        const segnoCalc = gc > gt ? '1' : gc < gt ? '2' : 'X';
        _pronostici.gironi[matchId].segno = segnoCalc;
        // Aggiorna UI pulsanti segno
        document.querySelectorAll(`.segno-btn[data-match="${matchId}"]`).forEach(b => {
          b.classList.toggle('active', b.dataset.segno === segnoCalc);
        });
      }
    });
  });
}

function _syncSegnoFromScore(matchId) {
  const gc = _pronostici.gironi?.[matchId]?.gol_casa;
  const gt = _pronostici.gironi?.[matchId]?.gol_trasferta;
  if (gc != null && gt != null) {
    const s = gc > gt ? '1' : gc < gt ? '2' : 'X';
    _pronostici.gironi[matchId].segno = s;
    document.querySelectorAll(`.segno-btn[data-match="${matchId}"]`).forEach(b => {
      b.classList.toggle('active', b.dataset.segno === s);
    });
  }
}

// ── TAB 2: FASE ELIMINATORIA ──────────────────────────
const FASI_ELIM = [
  { id: 'sedicesimi', label: 'Sedicesimi di finale', matches: _getSedicesimi() },
  { id: 'ottavi',     label: 'Ottavi di finale',     matches: _getOttavi() },
  { id: 'quarti',     label: 'Quarti di finale',     matches: _getQuarti() },
  { id: 'semifinali', label: 'Semifinali',           matches: _getSemifinali() },
  { id: 'finale',     label: 'Finale',               matches: _getFinale() },
];

function _getSedicesimi() {
  const fase = DB.fase_eliminatoria?.sedicesimi?.partite || {};
  return Object.entries(fase).map(([id, p]) => ({ id, ...p }));
}
function _getOttavi() {
  const fase = DB.fase_eliminatoria?.ottavi?.partite || {};
  return Object.entries(fase).map(([id, p]) => ({ id, ...p }));
}
function _getQuarti() {
  const fase = DB.fase_eliminatoria?.quarti?.partite || {};
  return Object.entries(fase).map(([id, p]) => ({ id, ...p }));
}
function _getSemifinali() {
  const fase = DB.fase_eliminatoria?.semifinali?.partite || {};
  return Object.entries(fase).map(([id, p]) => ({ id, ...p }));
}
function _getFinale() {
  const fase = DB.fase_eliminatoria?.finale || {};
  const p = fase.partita || {};
  return p ? [{ id: 'F', ...p }] : [];
}

function _renderEliminatoria() {
  const container = document.getElementById('eliminatoria-container');
  let html = '';

  FASI_ELIM.forEach(({ id, label, matches }) => {
    if (!matches.length) return;
    html += `<div class="fase-block">
      <h3 class="fase-title">${label}</h3>
      <div class="fase-matches">`;

    matches.forEach(m => {
      html += _renderMatchElim(id, m);
    });

    html += `</div></div>`;
  });

  container.innerHTML = html || '<p class="text-muted">Il bracket eliminatorio sarà disponibile al termine dei gironi.</p>';
  _bindEliminatoria();
}

function _renderMatchElim(faseId, match) {
  const saved     = _pronostici?.fase_eliminatoria?.[faseId]?.[match.id] || {};
  const vincSaved = saved.vincitore || '';
  const modSaved  = saved.modalita  || '';

  // Per sedicesimi/ottavi/quarti/semifinali i placeholder sono TBD
  // L'utente scrive direttamente il nome della squadra (select con le 48 squadre)
  const squadreOptions = Object.entries(DB.squadre)
    .map(([id, sq]) => `<option value="${id}" ${vincSaved === id ? 'selected' : ''}>${sq.flag || ''} ${sq.nome}</option>`)
    .join('');

  const modalita = [
    { v: '90min',         l: '90\'' },
    { v: 'supplementari', l: 'Suppl.' },
    { v: 'rigori',        l: 'Rigori' },
  ];

  const modHtml = modalita.map(({ v, l }) =>
    `<button type="button" class="modalita-btn${modSaved === v ? ' active' : ''}"
      data-fase="${faseId}" data-match="${match.id}" data-mod="${v}">${l}</button>`
  ).join('');

  const casaLabel     = match.casa      ? (DB.squadre[match.casa]?.nome      || match.casa)      : '?';
  const trasfLabel    = match.trasferta ? (DB.squadre[match.trasferta]?.nome  || match.trasferta) : '?';
  const casaFlag      = match.casa      ? (DB.squadre[match.casa]?.flag      || '') : '';
  const trasfFlag     = match.trasferta ? (DB.squadre[match.trasferta]?.flag  || '') : '';

  return `
    <div class="elim-match-card" data-fase="${faseId}" data-id="${match.id}">
      <div class="elim-matchup">
        <span class="elim-team">${casaFlag} ${casaLabel}</span>
        <span class="elim-vs">vs</span>
        <span class="elim-team">${trasfFlag} ${trasfLabel}</span>
      </div>
      <div class="elim-pick">
        <label class="field-label-sm">Chi passa?</label>
        <select class="field-input field-input-sm vincitore-select"
          data-fase="${faseId}" data-match="${match.id}">
          <option value="">— Seleziona —</option>
          ${squadreOptions}
        </select>
      </div>
      <div class="elim-modalita">
        <label class="field-label-sm">Come?</label>
        <div class="modalita-group">
          ${modHtml}
        </div>
      </div>
    </div>`;
}

function _bindEliminatoria() {
  // Select vincitore
  document.querySelectorAll('.vincitore-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const fase  = sel.dataset.fase;
      const match = sel.dataset.match;
      _setElim(fase, match, 'vincitore', sel.value || null);
    });
  });

  // Bottoni modalità
  document.querySelectorAll('.modalita-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fase  = btn.dataset.fase;
      const match = btn.dataset.match;
      const mod   = btn.dataset.mod;

      // Toggle active nel gruppo
      document.querySelectorAll(`.modalita-btn[data-fase="${fase}"][data-match="${match}"]`)
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      _setElim(fase, match, 'modalita', mod);
    });
  });
}

function _setElim(faseId, matchId, field, value) {
  if (!_pronostici.fase_eliminatoria) _pronostici.fase_eliminatoria = {};
  if (!_pronostici.fase_eliminatoria[faseId]) _pronostici.fase_eliminatoria[faseId] = {};
  if (!_pronostici.fase_eliminatoria[faseId][matchId]) _pronostici.fase_eliminatoria[faseId][matchId] = {};
  _pronostici.fase_eliminatoria[faseId][matchId][field] = value;
}

// ── TAB 3: SPECIALI ───────────────────────────────────
function _renderSpeciali() {
  const container = document.getElementById('speciali-container');

  // ── Capocannonieri ────────────────────────────────
  const pCannon = _pronostici?.capocannoniere || {};

  const allSquadre = Object.entries(DB.squadre)
    .map(([id, sq]) => `<option value="${id}">${sq.flag || ''} ${sq.nome}</option>`)
    .join('');

  // Per il capocannoniere usiamo un campo testo libero (giocatore, non squadra)
  const cannonPlaceholder = 'es. Mbappé';

  const html = `
    <div class="speciali-section">
      <h3 class="section-title">🥇 Capocannoniere</h3>
      <p class="section-desc">
        Pronostica i <strong>3 migliori marcatori</strong> del torneo in ordine.
        Punteggio: 1° → 40pt, 2° → 20pt, 3° → 10pt.
        Bonus +10 se un giocatore è nella terna ma non nell'ordine esatto.
      </p>
      <div class="cannon-inputs">
        ${[1,2,3].map(n => {
          const key = ['primo','secondo','terzo'][n-1];
          const val = pCannon[key] || '';
          return `
          <div class="field-group">
            <label class="field-label">${n}° Capocannoniere</label>
            <input type="text" class="field-input" id="cannon-${key}"
              name="cannon_${key}" value="${val}"
              placeholder="${cannonPlaceholder}" autocomplete="off">
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="speciali-section">
      <h3 class="section-title">📊 Posizioni finali nei gironi</h3>
      <p class="section-desc">
        Per ogni girone, indica l'ordine finale delle 4 squadre.
        <strong>10 punti</strong> per ogni posizione corretta, ma <em>solo per le squadre
        che si qualificano ai sedicesimi di finale</em>.
      </p>
      <div class="gironi-posiz-grid" id="gironi-posiz-container">
        ${_renderPosizioniGironi()}
      </div>
    </div>`;

  container.innerHTML = html;
  _bindSpeciali();
}

function _renderPosizioniGironi() {
  let html = '';
  Object.entries(DB.gironi).forEach(([lettera, girone]) => {
    const savedPosiz = _pronostici?.posizioni_girone?.[lettera] || [];

    html += `
      <div class="girone-posiz-card">
        <div class="girone-posiz-header">Girone ${lettera}</div>
        <div class="posiz-slots" data-girone="${lettera}">
          ${[0,1,2,3].map(i => {
            const currId = savedPosiz[i] || '';
            const squadreOpts = girone.squadre.map(id => {
              const sq = DB.squadre[id];
              return `<option value="${id}" ${currId === id ? 'selected' : ''}>${sq?.flag || ''} ${sq?.nome || id}</option>`;
            }).join('');
            return `
              <div class="posiz-slot">
                <span class="posiz-num">${i+1}°</span>
                <select class="field-input field-input-sm posiz-select"
                  data-girone="${lettera}" data-pos="${i}">
                  <option value="">—</option>
                  ${squadreOpts}
                </select>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  });
  return html;
}

function _bindSpeciali() {
  // Capocannonieri
  ['primo','secondo','terzo'].forEach(key => {
    const input = document.getElementById(`cannon-${key}`);
    if (!input) return;
    input.addEventListener('input', () => {
      if (!_pronostici.capocannoniere) _pronostici.capocannoniere = {};
      _pronostici.capocannoniere[key] = input.value.trim() || null;
    });
  });

  // Posizioni girone
  document.querySelectorAll('.posiz-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const lettera = sel.dataset.girone;
      const pos     = parseInt(sel.dataset.pos);
      if (!_pronostici.posizioni_girone) _pronostici.posizioni_girone = {};
      if (!_pronostici.posizioni_girone[lettera]) _pronostici.posizioni_girone[lettera] = [];
      _pronostici.posizioni_girone[lettera][pos] = sel.value || null;
    });
  });
}

// ── SALVATAGGIO ───────────────────────────────────────
async function _salvaPronostici() {
  const btn = document.getElementById('btn-salva-pronostici');
  const msg = document.getElementById('pronostici-save-msg');

  btn.disabled = true;
  btn.textContent = '⏳ Salvataggio…';

  try {
    // Raccoglie tutti i valori input dal DOM prima di salvare
    _raccogliDalDOM();

    await savePronostici(STATE.utente.id, _pronostici);
    showToast('Pronostici salvati! 🎉', 'success');
    msg.textContent = `Salvato il ${new Date().toLocaleString('it-IT')}`;
    msg.className = 'save-message save-ok';
    msg.style.display = '';
  } catch (e) {
    console.error('Errore salvataggio:', e);
    showToast('Errore nel salvataggio. Riprova.', 'error');
    msg.textContent = 'Errore nel salvataggio.';
    msg.className = 'save-message save-error';
    msg.style.display = '';
  } finally {
    btn.disabled = !_pronosticiAperti;
    btn.textContent = '💾 Salva i miei pronostici';
  }
}

/**
 * Raccoglie tutti i valori dal DOM in _pronostici prima del salvataggio.
 * (I segni e le select sono già aggiornati via event listener,
 *  ma i campi numerici e testo richiedono una lettura finale.)
 */
function _raccogliDalDOM() {
  // Gol partite girone
  document.querySelectorAll('.score-input').forEach(input => {
    const matchId = input.dataset.match;
    const field   = input.dataset.field;
    const val     = parseInt(input.value);
    if (!_pronostici.gironi) _pronostici.gironi = {};
    if (!_pronostici.gironi[matchId]) _pronostici.gironi[matchId] = {};
    _pronostici.gironi[matchId][field] = isNaN(val) ? null : val;
  });

  // Capocannonieri (in caso di paste/autofill non catturato)
  ['primo','secondo','terzo'].forEach(key => {
    const input = document.getElementById(`cannon-${key}`);
    if (!input) return;
    if (!_pronostici.capocannoniere) _pronostici.capocannoniere = {};
    _pronostici.capocannoniere[key] = input.value.trim() || null;
  });
}

// ── HELPERS ───────────────────────────────────────────
function _fmtData(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Rome',
    });
  } catch {
    return iso;
  }
}
