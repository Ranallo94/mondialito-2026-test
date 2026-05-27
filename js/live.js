/**
 * MONDIALITO 2026 — live.js
 * Partite live, oggi, prossime e risultati recenti.
 * I dati arrivano dalla Cloud Function che aggiorna Firestore 'live/oggi'.
 */

import DB from '../mondialito_db.json' with { type: 'json' };
import { onLiveSnapshot } from './db.js';
import { showSpinner, showEmpty, formatTime, formatDate } from './ui.js';

let _unsub = null;

// ── INIT ──────────────────────────────────────────────
export async function initLive() {
  showSpinner('live-partite-oggi', 'Caricamento partite…');

  _unsub = onLiveSnapshot((liveData) => {
    _renderLive(liveData);
    _aggiornaBadge(liveData);
    _aggiornaTimestamp(liveData);
  });
}

// ── RENDER PRINCIPALE ─────────────────────────────────
function _renderLive(data) {
  const { oggi = [], prossime = [], risultati = [] } = data;

  _renderOggi(oggi);
  _renderProssime(prossime);
  _renderRisultati(risultati);

  // Mostra/nascondi sezioni
  document.getElementById('live-oggi').style.display    = oggi.length    ? '' : 'none';
  document.getElementById('live-prossime').style.display = prossime.length ? '' : 'none';
  document.getElementById('live-risultati').style.display = risultati.length ? '' : 'none';

  // Se non c'è niente
  if (!oggi.length && !prossime.length && !risultati.length) {
    document.getElementById('live-partite-oggi').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚽</div>
        <p>Nessuna partita disponibile al momento.</p>
      </div>`;
    document.getElementById('live-oggi').style.display = '';
  }
}

// ── OGGI / LIVE ───────────────────────────────────────
function _renderOggi(partite) {
  const el = document.getElementById('live-partite-oggi');
  if (!el) return;

  if (!partite.length) {
    el.innerHTML = '<p class="text-muted">Nessuna partita oggi.</p>';
    return;
  }

  el.innerHTML = partite.map(p => _cardPartita(p, true)).join('');
}

// ── PROSSIME ──────────────────────────────────────────
function _renderProssime(partite) {
  const el = document.getElementById('live-partite-prossime');
  if (!el) return;
  el.innerHTML = partite.map(p => _cardPartita(p, false)).join('');
}

// ── RISULTATI RECENTI ─────────────────────────────────
function _renderRisultati(partite) {
  const el = document.getElementById('live-partite-risultati');
  if (!el) return;
  el.innerHTML = partite.map(p => _cardRisultato(p)).join('');
}

// ── CARD PARTITA ──────────────────────────────────────
function _cardPartita(p, mostraOrario = true) {
  const casa     = DB.squadre[p.casa]      || { nome: p.casa,      flag: '' };
  const trasf    = DB.squadre[p.trasferta] || { nome: p.trasferta, flag: '' };
  const isLive   = p.stato === 'IN_PLAY' || p.stato === 'PAUSED';
  const liveClass = isLive ? ' match-card-live' : '';

  const minuto  = isLive && p.minuto ? `<span class="live-badge">🔴 ${p.minuto}'</span>` : '';
  const orario  = mostraOrario && p.orario
    ? `<span class="match-time">${formatTime(p.orario)}</span>`
    : '';
  const fase    = p.fase ? `<span class="match-fase">${_labelFase(p.fase)}</span>` : '';

  const scoreHtml = (p.gol_casa != null && p.gol_trasferta != null)
    ? `<span class="live-score">${p.gol_casa} — ${p.gol_trasferta}</span>`
    : `<span class="live-score-dash">—</span>`;

  return `
    <div class="match-card${liveClass}">
      <div class="match-card-meta">${orario}${fase}${minuto}</div>
      <div class="match-card-main">
        <div class="match-team">
          <span class="team-flag">${casa.flag || ''}</span>
          <span class="team-nome">${casa.nome}</span>
        </div>
        ${scoreHtml}
        <div class="match-team match-team-away">
          <span class="team-nome">${trasf.nome}</span>
          <span class="team-flag">${trasf.flag || ''}</span>
        </div>
      </div>
    </div>`;
}

// ── CARD RISULTATO ────────────────────────────────────
function _cardRisultato(p) {
  const casa     = DB.squadre[p.casa]      || { nome: p.casa,      flag: '' };
  const trasf    = DB.squadre[p.trasferta] || { nome: p.trasferta, flag: '' };
  const data     = p.orario ? formatDate(p.orario) : '';
  const fase     = p.fase ? _labelFase(p.fase) : '';

  const gcN = parseInt(p.gol_casa);
  const gtN = parseInt(p.gol_trasferta);
  const segno = !isNaN(gcN) && !isNaN(gtN)
    ? (gcN > gtN ? 'casa' : gcN < gtN ? 'trasf' : 'pari')
    : '';

  return `
    <div class="match-card match-card-done">
      <div class="match-card-meta">${data} ${fase ? '· ' + fase : ''}</div>
      <div class="match-card-main">
        <div class="match-team ${segno === 'casa' ? 'winner' : ''}">
          <span class="team-flag">${casa.flag || ''}</span>
          <span class="team-nome">${casa.nome}</span>
        </div>
        <span class="live-score result-score">${p.gol_casa} — ${p.gol_trasferta}</span>
        <div class="match-team match-team-away ${segno === 'trasf' ? 'winner' : ''}">
          <span class="team-nome">${trasf.nome}</span>
          <span class="team-flag">${trasf.flag || ''}</span>
        </div>
      </div>
      ${p.modalita && p.modalita !== '90min' ? `<div class="match-modalita">${_labelModalita(p.modalita)}</div>` : ''}
    </div>`;
}

// ── BADGE NAV ─────────────────────────────────────────
function _aggiornaBadge(data) {
  const badge = document.getElementById('nav-live-badge');
  if (!badge) return;
  const hasLive = (data.oggi || []).some(p => p.stato === 'IN_PLAY' || p.stato === 'PAUSED');
  badge.style.display = hasLive ? '' : 'none';
}

// ── TIMESTAMP ─────────────────────────────────────────
function _aggiornaTimestamp(data) {
  const el = document.getElementById('live-updated');
  if (!el) return;
  if (data.updatedAt) {
    const d = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
    el.textContent = `Aggiornato: ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

// ── HELPERS ───────────────────────────────────────────
function _labelFase(fase) {
  const map = {
    gironi:     'Fase a gironi',
    sedicesimi: 'Sedicesimi',
    ottavi:     'Ottavi',
    quarti:     'Quarti',
    semifinali: 'Semifinali',
    finale:     'Finale',
  };
  return map[fase] || fase;
}

function _labelModalita(mod) {
  return { '90min': '90\'', supplementari: 'Supplementari', rigori: 'Rigori' }[mod] || mod;
}
