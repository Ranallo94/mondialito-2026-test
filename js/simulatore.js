/**
 * MONDIALITO 2026 — simulatore.js
 * Tab "Simulatore" dentro "Il mio profilo".
 *
 * Permette di simulare gli esiti di semifinali e finale (vincitore +
 * modalità di passaggio turno) e la terna dei migliori marcatori, e di
 * vedere quanti punti si otterrebbero e come cambierebbe la classifica.
 *
 * ⚠️ TUTTO CLIENT-SIDE: questo modulo esegue SOLO letture da Firestore.
 * Nessun risultato globale viene modificato — quello resta compito
 * esclusivo degli admin dal pannello dedicato.
 */

import DB from '../mondialito_db.json' with { type: 'json' };
import { STATE } from './app.js';
import { getRisultati, getClassifica, getTuttiPronostici } from './db.js';
import { calcolaPunteggio, calcolaSparegnio } from './punteggi.js';
import { GIOCATORI } from './pronostici.js';
import { showToast } from './ui.js';

// ── Stato del modulo ──────────────────────────────────
let _risultati   = null;   // risultati ufficiali (sola lettura)
let _classifica  = [];     // snapshot classifica ufficiale [{id, nome, totale, spareggio}]
let _pronosticiAll = null; // mappa uid → pronostici (caricata una volta)
let _caricato    = false;

// Scelte della simulazione (solo in memoria, mai salvate)
const _sim = {
  sf1: null, modSF1: null,
  sf2: null, modSF2: null,
  f:   null, modF:   null,
  primo: null, secondo: null, terzo: null,
};

const _MODALITA = [['90min', "90'"], ['supplementari', 'Suppl.'], ['rigori', 'Rigori']];
const _VALIDI_CANNON = new Set(GIOCATORI.map(g => g.cognome + ' (' + g.squadra + ')'));

function _squadreMap() {
  const sq = DB.squadre;
  if (Array.isArray(sq)) return Object.fromEntries(sq.map(s => [s.id, s]));
  return sq || {};
}

function _teamLabel(id) {
  const sq = _squadreMap()[id];
  return sq ? `${sq.flag || ''} ${sq.nome || id}`.trim() : (id || '?');
}

// ── INIT (chiamata dal tab del profilo) ───────────────
export async function initSimulatore() {
  const el = document.getElementById('profilo-simulatore-container');
  if (!el) return;

  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Caricamento simulatore…</p></div>';

  try {
    // Letture in parallelo: risultati ufficiali, classifica, TUTTI i pronostici
    // (la lettura dei pronostici altrui è già permessa a ogni utente approvato).
    const [ris, cls, tutti] = await Promise.all([
      getRisultati(),
      getClassifica(),
      _pronosticiAll ? Promise.resolve(_pronosticiAll) : getTuttiPronostici(),
    ]);
    _risultati     = ris || {};
    _classifica    = cls || [];
    _pronosticiAll = tutti || {};
  } catch (e) {
    console.warn('[simulatore] errore caricamento:', e);
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Errore nel caricamento dei dati. Riprova più tardi.</p></div>';
    return;
  }

  const rElim  = _risultati.fase_eliminatoria || {};
  const quarti = rElim.quarti || {};
  const semifinaliste = {
    sf1: [quarti.Q1?.vincitore, quarti.Q2?.vincitore],
    sf2: [quarti.Q3?.vincitore, quarti.Q4?.vincitore],
  };

  // Il simulatore ha senso solo quando le 4 semifinaliste sono note.
  if (semifinaliste.sf1.some(t => !t) || semifinaliste.sf2.some(t => !t)) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎲</div>
        <p>Il simulatore sarà disponibile quando saranno note le <strong>4 semifinaliste</strong> (a quarti di finale conclusi).</p>
      </div>`;
    return;
  }

  // Prima apertura: precompila con gli eventuali risultati reali già inseriti
  // e con la terna marcatori dei PROPRI pronostici.
  if (!_caricato) {
    _caricato = true;
    const rSF1 = rElim.semifinali?.SF1, rSF2 = rElim.semifinali?.SF2, rF = rElim.finale?.F;
    if (rSF1?.vincitore) { _sim.sf1 = rSF1.vincitore; _sim.modSF1 = rSF1.modalita || null; }
    if (rSF2?.vincitore) { _sim.sf2 = rSF2.vincitore; _sim.modSF2 = rSF2.modalita || null; }
    if (rF?.vincitore && (rF.vincitore === _sim.sf1 || rF.vincitore === _sim.sf2)) {
      _sim.f = rF.vincitore; _sim.modF = rF.modalita || null;
    }
    const mioCannon = _pronosticiAll[STATE.utente?.id]?.capocannoniere || {};
    _sim.primo   = mioCannon.primo   || null;
    _sim.secondo = mioCannon.secondo || null;
    _sim.terzo   = mioCannon.terzo   || null;
  }

  // Coerenza: le scelte devono appartenere alle semifinaliste correnti
  if (_sim.sf1 && !semifinaliste.sf1.includes(_sim.sf1)) { _sim.sf1 = null; _sim.f = null; }
  if (_sim.sf2 && !semifinaliste.sf2.includes(_sim.sf2)) { _sim.sf2 = null; _sim.f = null; }

  _renderSimulatore(el, semifinaliste);
}

// ── RENDER UI ─────────────────────────────────────────
function _renderSimulatore(el, semifinaliste) {
  const matchCard = (titolo, matchKey, teams, vincitore, modKey, disabled = false, hint = '') => {
    const teamBtns = teams.map(t => t
      ? `<button type="button" class="sim-team-btn ${vincitore === t ? 'active' : ''}"
           data-match="${matchKey}" data-team="${t}" ${disabled ? 'disabled' : ''}>${_teamLabel(t)}</button>`
      : `<span class="sim-team-btn sim-team-tbd">?</span>`
    ).join('<span class="sim-vs">vs</span>');

    const modBtns = _MODALITA.map(([v, l]) =>
      `<button type="button" class="sim-mod-btn ${_sim[modKey] === v ? 'active' : ''}"
         data-modkey="${modKey}" data-mod="${v}" ${disabled ? 'disabled' : ''}>${l}</button>`
    ).join('');

    return `
      <div class="sim-match-card ${disabled ? 'sim-disabled' : ''}">
        <div class="sim-match-title">${titolo}</div>
        <div class="sim-teams-row">${teamBtns}</div>
        <div class="sim-mod-row">
          <span class="sim-mod-label">Come?</span>
          <div class="sim-mod-group">${modBtns}</div>
          <span class="sim-mod-opt">(opzionale, +5 pt modalità)</span>
        </div>
        ${hint ? `<div class="sim-hint">${hint}</div>` : ''}
      </div>`;
  };

  const finaleTeams = [_sim.sf1, _sim.sf2];
  const finaleReady = !!(_sim.sf1 && _sim.sf2);

  const cannonHtml = [
    { key: 'primo',   label: '🥇 1° marcatore' },
    { key: 'secondo', label: '🥈 2° marcatore' },
    { key: 'terzo',   label: '🥉 3° marcatore' },
  ].map(({ key, label }) => `
    <div class="field-group">
      <label class="field-label">${label}</label>
      <div class="autocomplete-wrap">
        <input type="text" class="field-input sim-cannon-input" id="sim-cannon-${key}" data-key="${key}"
               value="${_sim[key] || ''}" placeholder="Digita il cognome..." autocomplete="off">
        <div class="autocomplete-dropdown" id="sim-ac-drop-${key}"></div>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div class="info-banner info-banner--blue sim-banner">
      <span>🎲</span>
      <span>Questa è una <strong>simulazione personale</strong>: puoi provare tutti gli scenari che vuoi,
      <strong>nessun risultato ufficiale viene modificato</strong> e nessun altro partecipante vede le tue prove.
      I risultati reali possono essere inseriti solo dagli admin.</span>
    </div>

    <div class="breakdown-section">
      <h3 class="section-title">🏆 Semifinali e finale</h3>
      <div class="sim-matches">
        ${matchCard('Semifinale 1', 'sf1', semifinaliste.sf1, _sim.sf1, 'modSF1')}
        ${matchCard('Semifinale 2', 'sf2', semifinaliste.sf2, _sim.sf2, 'modSF2')}
        ${matchCard('Finale', 'f', finaleTeams, _sim.f, 'modF', !finaleReady,
          finaleReady ? '' : 'Scegli prima le vincitrici delle due semifinali.')}
      </div>
    </div>

    <div class="breakdown-section">
      <h3 class="section-title">👟 Migliori 3 marcatori</h3>
      <p class="section-desc">Terna finale simulata del torneo. ${_sim.f ? '' : '⚠️ I punti capocannoniere vengono assegnati solo a torneo concluso: scegli anche il <strong>vincitore della finale</strong> per vederli conteggiati.'}</p>
      <div class="cannon-inputs">${cannonHtml}</div>
    </div>

    <div id="sim-risultato"></div>
  `;

  // ── Bind vincitori ──
  el.querySelectorAll('.sim-team-btn[data-match]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { match, team } = btn.dataset;
      if (match === 'sf1' || match === 'sf2') {
        _sim[match] = _sim[match] === team ? null : team;
        // se cambia una finalista, la scelta della finale può decadere
        if (_sim.f && _sim.f !== _sim.sf1 && _sim.f !== _sim.sf2) _sim.f = null;
        if (!_sim[match]) _sim.f = null;
      } else if (match === 'f') {
        _sim.f = _sim.f === team ? null : team;
      }
      _renderSimulatore(el, semifinaliste); // re-render (aggiorna anche la finale)
    });
  });

  // ── Bind modalità ──
  el.querySelectorAll('.sim-mod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { modkey, mod } = btn.dataset;
      _sim[modkey] = _sim[modkey] === mod ? null : mod;
      el.querySelectorAll(`.sim-mod-btn[data-modkey="${modkey}"]`).forEach(b =>
        b.classList.toggle('active', b.dataset.mod === _sim[modkey]));
      _calcolaERender();
    });
  });

  // ── Bind marcatori (autocomplete come in pronostici) ──
  _bindCannonInputs(el);

  _calcolaERender();
}

// ── Autocomplete marcatori ────────────────────────────
function _normStr(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function _bindCannonInputs(el) {
  el.querySelectorAll('.sim-cannon-input').forEach(input => {
    const key  = input.dataset.key;
    const drop = document.getElementById('sim-ac-drop-' + key);

    const chiudi = () => { drop.innerHTML = ''; drop.style.display = 'none'; };

    const salva = (val) => {
      // evita doppioni nella terna
      if (val && ['primo', 'secondo', 'terzo'].some(k => k !== key && _sim[k] === val)) {
        input.value = '';
        _sim[key] = null;
        showToast('Questo giocatore è già nella terna', 'error');
        _calcolaERender();
        return;
      }
      _sim[key] = val || null;
      _calcolaERender();
    };

    const validaEChiudi = () => {
      setTimeout(() => {
        chiudi();
        const v = input.value.trim();
        if (v && !_VALIDI_CANNON.has(v)) {
          input.value = '';
          salva(null);
          input.classList.add('input-error');
          setTimeout(() => input.classList.remove('input-error'), 1500);
          showToast('Seleziona un calciatore dall\'elenco', 'error');
        } else {
          salva(v || null);
        }
      }, 200);
    };

    const suggerisci = (query) => {
      const q = _normStr(query.trim());
      if (q.length < 2) { chiudi(); return; }
      const matches = GIOCATORI.filter(g =>
        _normStr(g.cognome).includes(q) || _normStr(g.nome).includes(q)
      ).slice(0, 8);
      if (!matches.length) { chiudi(); return; }
      drop.innerHTML = matches.map(g =>
        `<div class="ac-item" data-val="${g.cognome} (${g.squadra})">
           <span class="ac-name">${g.cognome} ${g.nome}</span>
           <span class="ac-team">(${g.squadra})</span>
         </div>`).join('');
      drop.style.display = 'block';
      drop.querySelectorAll('.ac-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          input.value = item.dataset.val;
          input.classList.remove('input-error');
          chiudi();
          salva(item.dataset.val);
        });
      });
    };

    input.addEventListener('input', () => { input.classList.remove('input-error'); suggerisci(input.value); });
    input.addEventListener('blur',  validaEChiudi);
    input.addEventListener('focus', () => { if (input.value.length >= 2) suggerisci(input.value); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') chiudi(); });
  });
}

// ── CALCOLO E RENDER RISULTATO ────────────────────────
function _buildRisultatiSimulati() {
  // Clona i risultati ufficiali e applica SOLO in memoria le scelte simulate.
  const sim = structuredClone(_risultati || {});
  sim.fase_eliminatoria = sim.fase_eliminatoria || {};
  const fe = sim.fase_eliminatoria;
  fe.semifinali = fe.semifinali || {};
  fe.finale     = fe.finale     || {};

  const setMatch = (obj, key, casa, trasferta, vincitore, modalita) => {
    const prev = obj[key] || {};
    obj[key] = {
      ...prev,
      casa, trasferta,
      vincitore: vincitore || null,
      modalita:  modalita  || null,
    };
  };

  const rQ = fe.quarti || {};
  setMatch(fe.semifinali, 'SF1', rQ.Q1?.vincitore || null, rQ.Q2?.vincitore || null, _sim.sf1, _sim.modSF1);
  setMatch(fe.semifinali, 'SF2', rQ.Q3?.vincitore || null, rQ.Q4?.vincitore || null, _sim.sf2, _sim.modSF2);
  setMatch(fe.finale,     'F',   _sim.sf1 || null,         _sim.sf2 || null,         _sim.f,   _sim.modF);

  sim.capocannoniere_finale = {
    primo:   _sim.primo   || null,
    secondo: _sim.secondo || null,
    terzo:   _sim.terzo   || null,
  };
  return sim;
}

function _ordinaClassifica(lista) {
  const sorted = [...lista].sort((a, b) => {
    if (b.totale !== a.totale) return b.totale - a.totale;
    const sa = a.spareggio || [], sb = b.spareggio || [];
    for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
      if ((sb[i] || 0) !== (sa[i] || 0)) return (sb[i] || 0) - (sa[i] || 0);
    }
    return (a.nome || '').localeCompare(b.nome || '', 'it');
  });
  let pos = 1;
  sorted.forEach((p, i) => {
    if (i > 0) {
      const prev = sorted[i - 1];
      const samePts  = prev.totale === p.totale;
      const sameSpar = JSON.stringify(prev.spareggio) === JSON.stringify(p.spareggio);
      if (!samePts || !sameSpar) pos = i + 1;
    }
    p._pos = pos;
  });
  return sorted;
}

function _calcolaERender() {
  const out = document.getElementById('sim-risultato');
  if (!out) return;

  const haScelte = _sim.sf1 || _sim.sf2 || _sim.f || _sim.primo || _sim.secondo || _sim.terzo;
  if (!haScelte) {
    out.innerHTML = `
      <div class="breakdown-section">
        <h3 class="section-title">📊 Classifica simulata</h3>
        <div class="empty-state"><div class="empty-icon">🎲</div><p>Fai le tue scelte qui sopra: la classifica simulata appare automaticamente.</p></div>
      </div>`;
    return;
  }

  const risSim = _buildRisultatiSimulati();

  // Classifica ATTUALE (dallo snapshot ufficiale, stessi criteri di ordinamento)
  const attuale = _ordinaClassifica(_classifica);
  const posAttuale = Object.fromEntries(attuale.map(p => [p.id, p._pos]));
  const ptAttuali  = Object.fromEntries(attuale.map(p => [p.id, p.totale ?? 0]));

  // Classifica SIMULATA: ricalcolata client-side per ogni partecipante
  const listaSim = [];
  attuale.forEach(p => {
    const pron = _pronosticiAll[p.id];
    if (!pron) return;
    const { totale, breakdown } = calcolaPunteggio(pron, risSim);
    const spareggio = calcolaSparegnio(pron, risSim);
    listaSim.push({ id: p.id, nome: p.nome, totale, breakdown, spareggio });
  });
  const simulata = _ordinaClassifica(listaSim);

  const io = simulata.find(p => p.id === STATE.utente?.id);
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };

  // ── Card personale ──
  let cardIo = '';
  if (io) {
    const da    = posAttuale[io.id] ?? '—';
    const delta = io.totale - (ptAttuali[io.id] ?? 0);
    const bdSim = io.breakdown;
    const extra = [
      { label: 'Semifinali/Finale', pts: (bdSim.finale?.punti || 0) + (bdSim.vincitore?.punti || 0) },
      { label: 'Modalità',          pts: bdSim.modalita?.punti || 0 },
      { label: 'Capocannoniere',    pts: bdSim.capocannoniere?.punti || 0 },
    ];
    cardIo = `
      <div class="sim-io-card">
        <div class="sim-io-main">
          <div class="sim-io-pos">${medals[io._pos] || io._pos + '°'}</div>
          <div class="sim-io-info">
            <div class="sim-io-label">Con questo scenario chiuderesti a</div>
            <div class="sim-io-pts">${io.totale} pt
              <span class="sim-io-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">
                ${delta > 0 ? '+' + delta : delta} pt rispetto a oggi
              </span>
            </div>
            <div class="sim-io-posmove">Posizione: ${da}° → <strong>${io._pos}°</strong></div>
          </div>
        </div>
        <div class="sim-io-chips">
          ${extra.map(x => `<span class="bd-chip">${x.label}: <strong>${x.pts}</strong></span>`).join('')}
        </div>
      </div>`;
  }

  // ── Tabella classifica simulata ──
  const rows = simulata.map(p => {
    const da = posAttuale[p.id];
    const diffPos = da != null ? da - p._pos : 0;   // >0 = salito
    const diffPts = p.totale - (ptAttuali[p.id] ?? 0);
    const frecce = diffPos > 0 ? `<span class="sim-delta up">▲ ${diffPos}</span>`
                 : diffPos < 0 ? `<span class="sim-delta down">▼ ${-diffPos}</span>`
                 : `<span class="sim-delta same">=</span>`;
    const isMe = p.id === STATE.utente?.id;
    return `
      <div class="classifica-row sim-row ${isMe ? 'row-me' : ''} ${p._pos === 1 ? 'pos-1' : ''}">
        <div class="row-pos">${medals[p._pos] || p._pos + '°'}</div>
        <div class="row-info">
          <span class="row-nome">${p.nome || '—'}${isMe ? ' <span class="badge-tu">Tu</span>' : ''}</span>
          <div class="row-breakdown">${frecce}<span class="sim-pts-diff ${diffPts > 0 ? 'up' : ''}">${diffPts > 0 ? '+' + diffPts : diffPts} pt</span></div>
        </div>
        <div class="row-totale">${p.totale}</div>
      </div>`;
  }).join('');

  const note = !_sim.f
    ? `<div class="info-banner info-banner--yellow sim-note"><span>⚠️</span><span>Senza il <strong>vincitore della finale</strong> non vengono conteggiati né i 70 pt del campione né i punti capocannoniere (si assegnano solo a torneo concluso).</span></div>`
    : '';

  out.innerHTML = `
    <div class="breakdown-section">
      <h3 class="section-title">📊 Classifica simulata <span class="text-muted">· solo una prova, non modifica nulla</span></h3>
      ${note}
      ${cardIo}
      <div class="classifica-list sim-list">
        <div class="classifica-header"><span>Pos.</span><span>Partecipante</span><span>Punti</span></div>
        ${rows}
      </div>
    </div>`;
}
