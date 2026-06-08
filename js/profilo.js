/**
 * MONDIALITO 2026 — profilo.js
 * Pagina "Il mio profilo": punteggio personale, breakdown per categoria,
 * dettaglio partita per partita.
 */

import DB from '../mondialito_db.json' with { type: 'json' };
import { STATE, navigaA } from './app.js';
import { getPronostici, onRisultatiSnapshot, onClassificaSnapshot } from './db.js';
import { calcolaPunteggio } from './punteggi.js';
import { showSpinner } from './ui.js';
import { renderRiepilogoGironi, renderTabellone } from './bracket.js';
import { aggiornaUtenteLocale } from './auth.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';

let _pronostici  = null;
let _risultati   = {};
let _classifica  = [];
let _unsubRis    = null;
let _unsubClass  = null;
let _targetUid   = null;   // uid visualizzato (null = utente corrente)
let _targetNome  = null;

// ── INIT ──────────────────────────────────────────────
export async function initProfilo() {
  // Cancella subscriptions precedenti
  _unsubRis?.();
  _unsubClass?.();

  _targetUid  = STATE.profiloUid || STATE.utente?.id;
  _targetNome = null;  // verrà ricavato dalla classifica

  showSpinner('profilo-breakdown', 'Caricamento profilo…');
  _renderHeader();

  // Carica pronostici dell'utente target
  try {
    _pronostici = await getPronostici(_targetUid);
  } catch (e) {
    console.warn('Errore caricamento pronostici:', e);
    _pronostici = null;
  }

  // Ascolta risultati per aggiornamento live
  _unsubRis = onRisultatiSnapshot((ris) => {
    _risultati = ris;
    _renderProfilo();
    _renderSchedaPronostici();
  });

  // Ascolta classifica per la posizione
  _unsubClass = onClassificaSnapshot((cl) => {
    _classifica = cl;
    const entry = cl.find(p => p.id === _targetUid);
    if (entry) _targetNome = entry.nome;
    _renderHeader();
    _renderProfilo();
  });

  // Tab interni: Riepilogo / Scheda / Impostazioni
  const isAltrui = STATE.profiloUid && STATE.profiloUid !== STATE.utente?.id;

  // Mostra/nascondi tab Impostazioni (solo profilo proprio)
  const tabImpostazioni = document.getElementById('tab-btn-impostazioni');
  if (tabImpostazioni) tabImpostazioni.style.display = isAltrui ? 'none' : '';

  document.getElementById('profilo-inner-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    const tabId = btn.dataset.tab;
    document.querySelectorAll('#profilo-inner-tabs .tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('#page-profilo .tab-content').forEach(el => {
      el.classList.toggle('active', el.id === tabId);
    });
    // Rendering lazy
    if (tabId === 'tab-profilo-scheda') _renderSchedaPronostici();
    if (tabId === 'tab-profilo-impostazioni') _renderImpostazioni();
  });

  // Titolo pagina
  const titleEl = document.getElementById('profilo-page-title');
  if (titleEl) {
    titleEl.textContent = STATE.profiloUid && STATE.profiloUid !== STATE.utente?.id
      ? '📋 Scheda partecipante'
      : '📊 Il mio profilo';
  }
}

// ── HEADER (torna indietro + nome se profilo altrui) ──
function _renderHeader() {
  const headerEl = document.getElementById('profilo-header-banner');
  if (!headerEl) return;

  const isAltrui = STATE.profiloUid && STATE.profiloUid !== STATE.utente?.id;
  if (isAltrui) {
    const nome = _targetNome || '…';
    headerEl.innerHTML = `
      <div class="profilo-banner-altrui">
        <button class="btn btn-ghost btn-sm" id="btn-torna-classifica">← Classifica</button>
        <span class="profilo-banner-nome">Scheda di <strong>${nome}</strong></span>
      </div>`;
    document.getElementById('btn-torna-classifica')?.addEventListener('click', () => {
      navigaA('classifica');
    });
  } else {
    headerEl.innerHTML = '';
  }
}

// ── RENDER PRINCIPALE ─────────────────────────────────
function _renderProfilo() {
  if (!_pronostici) {
    document.getElementById('profilo-breakdown').innerHTML =
      '<div class="empty-state"><div class="empty-icon">📋</div><p>Nessun pronostico trovato. Compila la tua scheda nella sezione Pronostici.</p></div>';
    return;
  }

  const { totale, breakdown: bd } = calcolaPunteggio(_pronostici, _risultati);

  // Posizione in classifica (dell'utente visualizzato)
  const entry = _classifica.find(p => p.id === _targetUid);
  const pos = entry?._pos || '—';

  // Score card (aggiorna il div già nel DOM)
  _renderScoreCard(totale, pos);

  // Breakdown per categoria
  _renderBreakdown(bd);

  // Dettaglio partite girone
  _renderDettaglioGironi(bd);
}

// ── SCORE CARD ────────────────────────────────────────
function _renderScoreCard(totale, pos) {
  const card = document.getElementById('profilo-score-card');
  if (!card) return;

  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const posLabel = medals[pos] || `${pos}°`;

  card.innerHTML = `
    <div class="score-card-inner">
      <div class="score-card-pos">${posLabel}</div>
      <div class="score-card-info">
        <div class="score-card-nome">${_targetNome || STATE.utente?.nome || ''}</div>
        <div class="score-card-totale">${totale} <span class="score-card-pt">pt</span></div>
      </div>
    </div>`;
}

// ── BREAKDOWN CATEGORIE ───────────────────────────────
function _renderBreakdown(bd) {
  const el = document.getElementById('profilo-breakdown');
  if (!el) return;

  const categorie = [
    {
      label: 'Fase a gironi — Segno 1X2',
      icon: '⚽',
      punti: bd.gironi_segno.punti,
      desc: `${bd.gironi_segno.corretti}/${bd.gironi_segno.totale} segni corretti`,
    },
    {
      label: 'Fase a gironi — Risultato esatto',
      icon: '🎯',
      punti: bd.gironi_esatto.punti,
      desc: `${bd.gironi_esatto.corretti}/${bd.gironi_esatto.totale} risultati esatti`,
    },
    {
      label: 'Posto in griglia',
      icon: '📊',
      punti: bd.posto_griglia.punti,
      desc: `${bd.posto_griglia.corretti} posizioni corrette (solo squadre ai sedicesimi)`,
    },
    {
      label: 'Sedicesimi di finale',
      icon: '🏟️',
      punti: bd.sedicesimi.punti,
      desc: `${bd.sedicesimi.corretti} squadre qualificate indovinate`,
    },
    {
      label: 'Ottavi di finale',
      icon: '⚡',
      punti: bd.ottavi.punti,
      desc: `${bd.ottavi.corretti} squadre indovinate`,
    },
    {
      label: 'Quarti di finale',
      icon: '🔥',
      punti: bd.quarti.punti,
      desc: `${bd.quarti.corretti} squadre indovinate`,
    },
    {
      label: 'Semifinali',
      icon: '💥',
      punti: bd.semifinali.punti,
      desc: `${bd.semifinali.corretti} squadre indovinate`,
    },
    {
      label: 'Finaliste',
      icon: '🏆',
      punti: bd.finale.punti,
      desc: `${bd.finale.corretti} finaliste indovinate`,
    },
    {
      label: 'Vincitore torneo',
      icon: '🥇',
      punti: bd.vincitore.punti,
      desc: bd.vincitore.corretto ? 'Campione indovinato! 🎉' : 'Campione non ancora noto',
    },
    {
      label: 'Modalità passaggio turno',
      icon: '🎲',
      punti: bd.modalita.punti,
      desc: `${bd.modalita.corretti} modalità indovinate`,
    },
    {
      label: 'Capocannoniere',
      icon: '👟',
      punti: bd.capocannoniere.punti,
      desc: bd.capocannoniere.dettaglio || 'Nessun punto ancora',
    },
  ];

  const totale = categorie.reduce((s, c) => s + c.punti, 0);

  el.innerHTML = `
    <div class="breakdown-section">
      <h3 class="section-title">📈 Dettaglio punteggio</h3>
      <div class="breakdown-list">
        ${categorie.map(c => `
          <div class="breakdown-row ${c.punti > 0 ? 'breakdown-has-pts' : ''}">
            <div class="bd-icon">${c.icon}</div>
            <div class="bd-info">
              <div class="bd-label">${c.label}</div>
              <div class="bd-desc">${c.desc}</div>
            </div>
            <div class="bd-pts ${c.punti > 0 ? 'bd-pts-pos' : ''}">${c.punti > 0 ? '+' + c.punti : '—'}</div>
          </div>`).join('')}
        <div class="breakdown-row breakdown-total">
          <div class="bd-icon">🏅</div>
          <div class="bd-info"><div class="bd-label"><strong>Totale</strong></div></div>
          <div class="bd-pts bd-pts-total"><strong>${totale}</strong></div>
        </div>
      </div>
    </div>`;
}

// ── DETTAGLIO PARTITE GIRONE ──────────────────────────
function _renderDettaglioGironi(bd) {
  const el = document.getElementById('profilo-partite');
  if (!el) return;

  const pGironi = _pronostici?.gironi || {};
  const rGironi = _risultati?.gironi  || {};

  let rows = '';
  let count = 0;

  Object.entries(DB.gironi).forEach(([lettera, girone]) => {
    girone.partite.forEach(p => {
      const r = rGironi[p.id];
      if (!r || r.gol_casa == null) return; // non ancora giocata
      const pr = pGironi[p.id];
      if (!pr) return;

      count++;
      const casa  = DB.squadre[p.casa];
      const trasf = DB.squadre[p.trasferta];

      const segnoR = r.gol_casa > r.gol_trasferta ? '1' : r.gol_casa < r.gol_trasferta ? '2' : 'X';
      const segnoP = pr.segno || '?';
      const segnoOk = segnoP === segnoR;

      const esattoOk = pr.gol_casa == r.gol_casa && pr.gol_trasferta == r.gol_trasferta;
      const pti = (segnoOk ? 10 : 0) + (esattoOk ? 5 : 0);

      rows += `
        <div class="profilo-match-row ${segnoOk ? 'match-ok' : 'match-ko'}">
          <div class="pm-teams">
            ${casa?.flag || ''} ${casa?.nome || p.casa} vs ${trasf?.nome || p.trasferta} ${trasf?.flag || ''}
          </div>
          <div class="pm-result">
            <span class="pm-real">${r.gol_casa}–${r.gol_trasferta}</span>
            <span class="pm-sep">·</span>
            <span class="pm-pron ${segnoOk ? 'ok' : 'ko'}">${pr.gol_casa ?? '?'}–${pr.gol_trasferta ?? '?'} (${segnoP})</span>
            ${esattoOk ? '<span class="pm-esatto">🎯</span>' : ''}
          </div>
          <div class="pm-pts ${pti > 0 ? 'pts-pos' : ''}">${pti > 0 ? '+' + pti : '0'} pt</div>
        </div>`;
    });
  });

  if (!count) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚽</div><p>Le partite dei gironi non sono ancora iniziate.</p></div>';
    return;
  }

  el.innerHTML = `
    <div class="breakdown-section">
      <h3 class="section-title">⚽ Partite giocate — girone</h3>
      <div class="profilo-matches-list">${rows}</div>
    </div>`;
}

// ── SCHEDA PRONOSTICI COMPLETA (read-only) ────────────
function _renderSchedaPronostici() {
  const el = document.getElementById('profilo-scheda-container');
  if (!el) return;
  if (!_pronostici) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Nessun pronostico trovato.</p></div>';
    return;
  }

  // Se la scheda è nascosta, i pronostici sono ancora aperti, e stiamo guardando il profilo altrui → placeholder
  // Una volta che i pronostici sono chiusi, la privacy decade e tutti possono vedere le schede
  const isAltrui = STATE.profiloUid && STATE.profiloUid !== STATE.utente?.id;
  if (isAltrui && _pronostici.pronostico_nascosto && STATE.pronosticiAperti) {
    el.innerHTML = `
      <div class="empty-state empty-state--locked">
        <div class="empty-icon">🔒</div>
        <p>Questo partecipante ha scelto di nascondere la propria scheda pronostici.</p>
      </div>`;
    return;
  }

  const pGironi = _pronostici.gironi              || {};
  const pCannon = _pronostici.capocannoniere      || {};
  const rGironi = _risultati.gironi               || {};

  const sq = (id) => {
    if (!id) return '<span class="scheda-tbd">—</span>';
    const s = DB.squadre[id];
    return s ? `${s.flag} ${s.nome}` : id;
  };

  // ── 1. GIRONI ──────────────────────────────────────
  let htmlGironi = '';
  Object.entries(DB.gironi).forEach(([lettera, girone]) => {
    const matchRows = girone.partite.map(p => {
      const pr = pGironi[p.id];
      const r  = rGironi[p.id];
      const casa  = DB.squadre[p.casa]      || { nome: p.casa,      flag: '' };
      const trasf = DB.squadre[p.trasferta] || { nome: p.trasferta, flag: '' };

      const hasResult = r?.gol_casa != null;
      const segnoR = hasResult ? (r.gol_casa > r.gol_trasferta ? '1' : r.gol_casa < r.gol_trasferta ? '2' : 'X') : null;
      const ok = pr && segnoR && pr.segno === segnoR;
      const esatto = pr && hasResult && pr.gol_casa == r.gol_casa && pr.gol_trasferta == r.gol_trasferta;

      const score = pr
        ? `<strong>${pr.gol_casa ?? '?'}–${pr.gol_trasferta ?? '?'}</strong> <span class="scheda-segno">(${pr.segno || '?'})</span>`
        : '<span class="scheda-tbd">—</span>';

      const badge = esatto ? ' 🎯' : ok ? ' ✓' : hasResult ? ' ✗' : '';
      const rowClass = hasResult ? (ok ? 'scheda-ok' : 'scheda-ko') : '';

      return `
        <div class="scheda-match-row ${rowClass}">
          <span class="scheda-team">${casa.flag} ${casa.nome}</span>
          <span class="scheda-score">${score}${badge}</span>
          <span class="scheda-team scheda-team-away">${trasf.nome} ${trasf.flag}</span>
        </div>`;
    }).join('');

    htmlGironi += `
      <div class="scheda-girone-block">
        <div class="scheda-girone-title">Girone ${lettera}</div>
        ${matchRows}
      </div>`;
  });

  // ── 4. CAPOCANNONIERE ──────────────────────────────
  const cannonHtml = [
    { pos: 'primo',   label: '🥇 1° marcatore' },
    { pos: 'secondo', label: '🥈 2° marcatore' },
    { pos: 'terzo',   label: '🥉 3° marcatore' },
  ].map(({ pos, label }) => {
    const id = pCannon[pos];
    return `<div class="scheda-griglia-item"><span class="scheda-cannon-label">${label}</span> <strong>${id || '—'}</strong></div>`;
  }).join('');

  // ── Struttura contenitore ──────────────────────────
  el.innerHTML = `
    <div class="scheda-section">
      <h3 class="section-title">⚽ Pronostici gironi</h3>
      <div class="scheda-gironi-grid">${htmlGironi || '<p class="text-muted">Non compilati</p>'}</div>
    </div>
    <div class="scheda-section">
      <h3 class="section-title">📊 Classifica gironi pronosticata</h3>
      <div id="scheda-riepilogo-container"></div>
    </div>
    <div class="scheda-section">
      <h3 class="section-title">🏟️ Tabellone eliminatorie</h3>
      <div id="scheda-tabellone-container" class="tb-scroll-wrapper"></div>
    </div>
    <div class="scheda-section">
      <h3 class="section-title">👟 Capocannoniere</h3>
      <div class="scheda-griglia-block">${cannonHtml}</div>
    </div>`;

  // Renderizza riepilogo e tabellone nei loro container
  renderRiepilogoGironi(document.getElementById('scheda-riepilogo-container'), _pronostici, DB);
  renderTabellone(document.getElementById('scheda-tabellone-container'), _pronostici, DB);
}

// ── IMPOSTAZIONI (solo profilo proprio) ───────────────
function _renderImpostazioni() {
  const el = document.getElementById('profilo-impostazioni-container');
  if (!el) return;

  const utente = STATE.utente;
  const nickAttuale = utente?.nickname || utente?.nome || '';

  el.innerHTML = `
    <div class="breakdown-section">
      <h3 class="section-title">✏️ Modifica nickname</h3>
      <div class="impostazioni-form">
        <p class="impostazioni-desc">Il nickname è il nome che appare in classifica e sulle schede.</p>
        <div class="field-group">
          <label class="field-label" for="input-nickname-new">Nuovo nickname</label>
          <input id="input-nickname-new" type="text" class="field-input"
            value="${nickAttuale}" maxlength="20" placeholder="es. Roby, Il Fenomeno, MrGol…">
          <div class="field-hint">2–20 caratteri</div>
        </div>
        <div id="nickname-feedback" class="field-feedback"></div>
        <button id="btn-salva-nickname" class="btn btn-primary btn-sm">Salva nickname</button>
      </div>
    </div>`;

  document.getElementById('btn-salva-nickname')?.addEventListener('click', async () => {
    const input = document.getElementById('input-nickname-new');
    const feedback = document.getElementById('nickname-feedback');
    const val = input?.value?.trim() || '';

    if (val.length < 2) {
      feedback.textContent = 'Il nickname deve avere almeno 2 caratteri.';
      feedback.className = 'field-feedback field-feedback--error';
      return;
    }

    const btn = document.getElementById('btn-salva-nickname');
    btn.disabled = true;
    btn.textContent = 'Salvataggio…';
    feedback.textContent = '';

    try {
      const fn = httpsCallable(window._firebase.functions, 'cambiaNickname');
      await fn({ nickname: val });
      aggiornaUtenteLocale({ nickname: val });
      const headerName = document.getElementById('header-user-name');
      if (headerName) headerName.textContent = val;
      feedback.textContent = 'Nickname aggiornato!';
      feedback.className = 'field-feedback field-feedback--ok';
    } catch (e) {
      feedback.textContent = 'Errore durante il salvataggio. Riprova.';
      feedback.className = 'field-feedback field-feedback--error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salva nickname';
    }
  });
}
