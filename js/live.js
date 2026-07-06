/**
 * MONDIALITO 2026 — live.js
 * Pagina Risultati: partite in corso, partite di oggi, risultati per girone, prossime.
 * Usa due snapshot paralleli: onLiveSnapshot (live/oggi) + onRisultatiSnapshot (risultati/ufficiali).
 */

import DB from '../mondialito_db.json' with { type: 'json' };
import { onLiveSnapshot, onRisultatiSnapshot, onMarcatoriSnapshot } from './db.js';
import { formatTime, formatDate } from './ui.js';
import {
  getClassificaGirone, calcola3rdiSlots, resolveSlot, SEDICESIMI_BRACKET, BRACKET_FEEDS,
} from './bracket.js';

// Mappa squadre id → { nome, flag }, robusta sia che DB.squadre sia array sia oggetto.
const SQUADRE = Array.isArray(DB.squadre)
  ? Object.fromEntries(DB.squadre.map(s => [s.id, s]))
  : (DB.squadre || {});
const _sq = (id) => SQUADRE[id] || { nome: id, flag: '' };

// Etichette leggibili per la modalità di passaggio del turno.
const MODALITA_RIS = { '90min': "90'", 'supplementari': 'd.t.s.', 'rigori': 'rig.' };

let _unsubLive      = null;
let _unsubRis       = null;
let _unsubMarcatori = null;

// Stato locale condiviso tra i due snapshot
let _liveData  = { oggi: [], prossime: [], risultati: [] };
let _risultati = {};
let _marcatori = [];

// ── INIT ──────────────────────────────────────────────
export async function initLive() {
  _unsubLive = onLiveSnapshot((data) => {
    _liveData = data || {};
    _render();
    _aggiornaBadge();
    _aggiornaTimestamp();
  });

  _unsubRis = onRisultatiSnapshot((data) => {
    _risultati = data || {};
    _renderOttavi();
    _renderSedicesimi();
    _renderGironi();
  });

  _unsubMarcatori = onMarcatoriSnapshot((lista) => {
    _marcatori = lista || [];
    _renderMarcatori();
  });

  // Tab interni: Partite / Marcatori
  document.getElementById('live-inner-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    const tabId = btn.dataset.tab;
    document.querySelectorAll('#live-inner-tabs .tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('#page-live .tab-content').forEach(el => {
      el.classList.toggle('active', el.id === tabId);
    });
  });
}

// ── RENDER PRINCIPALE ─────────────────────────────────
function _render() {
  const oggi     = _liveData.oggi     || [];
  const prossime = _liveData.prossime || [];

  const inCorso  = oggi.filter(p => p.stato === 'IN_PLAY' || p.stato === 'PAUSED');
  const soloOggi = oggi.filter(p => p.stato !== 'IN_PLAY' && p.stato !== 'PAUSED');

  // ── In corso ──
  const elInCorso = document.getElementById('live-in-corso');
  const elPartiteInCorso = document.getElementById('live-partite-incorso');
  if (elInCorso && elPartiteInCorso) {
    if (inCorso.length) {
      elPartiteInCorso.innerHTML = inCorso.map(p => _cardLive(p)).join('');
      elInCorso.style.display = '';
    } else {
      elInCorso.style.display = 'none';
    }
  }

  // ── Oggi (non ancora iniziate) ──
  const elOggi = document.getElementById('live-oggi');
  const elPartiteOggi = document.getElementById('live-partite-oggi');
  if (elOggi && elPartiteOggi) {
    if (soloOggi.length) {
      elPartiteOggi.innerHTML = soloOggi.map(p => _cardOggi(p)).join('');
      elOggi.style.display = '';
    } else {
      elOggi.style.display = 'none';
    }
  }

  // ── Prossime ──
  const elProssime = document.getElementById('live-prossime');
  const elPartiteProssime = document.getElementById('live-partite-prossime');
  if (elProssime && elPartiteProssime) {
    if (prossime.length) {
      elPartiteProssime.innerHTML = prossime.map(p => _cardProssima(p)).join('');
      elProssime.style.display = '';
    } else {
      elProssime.style.display = 'none';
    }
  }
}

// ── OTTAVI DI FINALE ──────────────────────────────────
// Le 8 partite del secondo turno a eliminazione diretta. Le squadre sono i
// vincitori dei sedicesimi (BRACKET_FEEDS O1-O8). L'esito (chi passa + modalità)
// arriva da risultati.fase_eliminatoria.ottavi.
function _renderOttavi() {
  const container = document.getElementById('live-ottavi-container');
  if (!container) return;

  const rSed = _risultati.fase_eliminatoria?.sedicesimi || {};
  const rOtt = _risultati.fase_eliminatoria?.ottavi || {};

  // Nessun sedicesimo ancora deciso → gli ottavi non sono ancora definibili.
  const qualcunoSed = Object.values(rSed).some(r => r && r.vincitore);
  if (!qualcunoSed) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <p>Gli ottavi di finale saranno disponibili al termine dei sedicesimi.</p>
      </div>`;
    return;
  }

  const ottaviIds = ['O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7', 'O8'];
  let played = 0;

  const rows = ottaviIds.map(oid => {
    const feed = BRACKET_FEEDS[oid];
    const casaId  = rSed[feed.casa.id]?.vincitore  || null;
    const trasfId = rSed[feed.trasf.id]?.vincitore || null;
    const casa = _sq(casaId), trasf = _sq(trasfId);
    const res  = rOtt[oid] || {};
    const vinc = res.vincitore || null;
    if (vinc) played++;

    const hasScore = res.gol_casa != null && res.gol_trasferta != null;
    const hasRig   = res.rig_casa != null && res.rig_trasferta != null;
    let modText = vinc && res.modalita ? (MODALITA_RIS[res.modalita] || '') : '';
    if (vinc && res.modalita === 'rigori' && hasRig) modText = `${res.rig_casa}-${res.rig_trasferta} rig.`;

    let center;
    if (vinc) {
      const scoreHtml = hasScore
        ? `<span class="sed-score"><strong>${res.gol_casa}</strong><span class="ris-sep">–</span><strong>${res.gol_trasferta}</strong></span>`
        : '';
      const badge = modText
        ? `<span class="sed-mod sed-mod-${res.modalita || 'x'}">${modText}</span>`
        : (scoreHtml ? '' : '<span class="sed-mod">✓</span>');
      center = scoreHtml + badge;
    } else {
      center = '<span class="ris-tbd">—</span>';
    }

    return `
      <div class="ris-match-row${vinc ? ' ris-done' : ''}">
        <span class="sed-mid">${oid}</span>
        <div class="ris-team ris-team-casa${vinc && vinc === casaId ? ' ris-winner' : ''}">
          <span>${casaId ? casa.flag : ''}</span>
          <span class="ris-nome">${casaId ? casa.nome : '—'}</span>
        </div>
        <div class="sed-center">${center}</div>
        <div class="ris-team ris-team-trasf${vinc && vinc === trasfId ? ' ris-winner' : ''}">
          <span class="ris-nome">${trasfId ? trasf.nome : '—'}</span>
          <span>${trasfId ? trasf.flag : ''}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="ris-girone-card sed-card">
      <div class="ris-girone-header">
        <span>Tabellone ottavi</span>
        <span class="ris-girone-progress">${played}/8</span>
      </div>
      <div class="ris-girone-matches">${rows}</div>
    </div>`;
}

// ── SEDICESIMI DI FINALE ──────────────────────────────
// Le 16 partite del primo turno a eliminazione diretta. Le squadre sono
// risolte dalle classifiche finali ufficiali dei gironi (posizioni_finali_gironi
// o, in mancanza, calcolate dai risultati se tutti i gironi sono completi) +
// gli slot delle migliori terze. L'esito (chi passa + modalità) arriva da
// risultati.fase_eliminatoria.sedicesimi.
function _renderSedicesimi() {
  const container = document.getElementById('live-sedicesimi-container');
  if (!container) return;

  const saved   = _risultati.posizioni_finali_gironi || {};
  const gironiR = _risultati.gironi || {};

  // Standings nel formato { A:[id1,id2,id3,id4], … }, con gate di completezza.
  const standings = {};
  let pronta = true;
  Object.keys(DB.gironi).forEach(l => {
    if (Array.isArray(saved[l]) && saved[l].length === 4) {
      standings[l] = saved[l];
    } else {
      const cl = getClassificaGirone(l, gironiR, DB);
      if (cl.length === 4 && cl.every(t => t.g === 3)) standings[l] = cl.map(t => t.id);
      else pronta = false;
    }
  });

  if (!pronta) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <p>I sedicesimi di finale saranno disponibili al termine della fase a gironi.</p>
      </div>`;
    return;
  }

  const terziSlots = calcola3rdiSlots(gironiR, DB, _risultati.spareggio_terze || null);
  const rSed = _risultati.fase_eliminatoria?.sedicesimi || {};

  const matches = [...SEDICESIMI_BRACKET].sort((a, b) => a.id.localeCompare(b.id));
  let played = 0;

  const rows = matches.map(b => {
    const casaId  = resolveSlot(b.casa,  standings, terziSlots);
    const trasfId = resolveSlot(b.trasf, standings, terziSlots);
    const casa = _sq(casaId), trasf = _sq(trasfId);
    const res  = rSed[b.id] || {};
    const vinc = res.vincitore || null;
    if (vinc) played++;

    const hasScore = res.gol_casa != null && res.gol_trasferta != null;
    const hasRig   = res.rig_casa != null && res.rig_trasferta != null;
    let modText = vinc && res.modalita ? (MODALITA_RIS[res.modalita] || '') : '';
    if (vinc && res.modalita === 'rigori' && hasRig) modText = `${res.rig_casa}-${res.rig_trasferta} rig.`;

    let center;
    if (vinc) {
      const scoreHtml = hasScore
        ? `<span class="sed-score"><strong>${res.gol_casa}</strong><span class="ris-sep">–</span><strong>${res.gol_trasferta}</strong></span>`
        : '';
      const badge = modText
        ? `<span class="sed-mod sed-mod-${res.modalita || 'x'}">${modText}</span>`
        : (scoreHtml ? '' : '<span class="sed-mod">✓</span>');
      center = scoreHtml + badge;
    } else {
      center = '<span class="ris-tbd">—</span>';
    }

    return `
      <div class="ris-match-row${vinc ? ' ris-done' : ''}">
        <span class="sed-mid">${b.id}</span>
        <div class="ris-team ris-team-casa${vinc && vinc === casaId ? ' ris-winner' : ''}">
          <span>${casaId ? casa.flag : ''}</span>
          <span class="ris-nome">${casaId ? casa.nome : '—'}</span>
        </div>
        <div class="sed-center">${center}</div>
        <div class="ris-team ris-team-trasf${vinc && vinc === trasfId ? ' ris-winner' : ''}">
          <span class="ris-nome">${trasfId ? trasf.nome : '—'}</span>
          <span>${trasfId ? trasf.flag : ''}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="ris-girone-card sed-card">
      <div class="ris-girone-header">
        <span>Tabellone sedicesimi</span>
        <span class="ris-girone-progress">${played}/16</span>
      </div>
      <div class="ris-girone-matches">${rows}</div>
    </div>`;
}

// ── RISULTATI PER GIRONE ──────────────────────────────
function _renderGironi() {
  const container = document.getElementById('live-gironi-container');
  if (!container) return;

  const gironiR = _risultati.gironi || {};
  const lettere = Object.keys(DB.gironi);
  let html = '<div class="ris-gironi-grid">';

  lettere.forEach(lettera => {
    const girone = DB.gironi[lettera];
    const partiteHtml = girone.partite.map(p => {
      const r    = gironiR[p.id] || {};
      const casa = _sq(p.casa);
      const trasf= _sq(p.trasferta);
      const hasScore = r.gol_casa != null && r.gol_trasferta != null;
      const gc = r.gol_casa, gt = r.gol_trasferta;
      const winner = hasScore ? (gc > gt ? 'casa' : gc < gt ? 'trasf' : 'pari') : '';

      const orario = p.data
        ? `<span class="ris-match-time">${_fmtDataBreve(p.data)}</span>`
        : '';

      return `
        <div class="ris-match-row${hasScore ? ' ris-done' : ''}">
          ${orario}
          <div class="ris-team ris-team-casa${winner === 'casa' ? ' ris-winner' : ''}">
            <span>${casa.flag}</span>
            <span class="ris-nome">${casa.nome}</span>
          </div>
          <div class="ris-score">
            ${hasScore ? `<strong>${gc}</strong><span class="ris-sep">–</span><strong>${gt}</strong>` : '<span class="ris-tbd">—</span>'}
          </div>
          <div class="ris-team ris-team-trasf${winner === 'trasf' ? ' ris-winner' : ''}">
            <span class="ris-nome">${trasf.nome}</span>
            <span>${trasf.flag}</span>
          </div>
        </div>`;
    }).join('');

    // Conta partite giocate
    const played = girone.partite.filter(p => gironiR[p.id]?.gol_casa != null).length;
    const total  = girone.partite.length;

    html += `
      <div class="ris-girone-card">
        <div class="ris-girone-header">
          <span>Girone ${lettera}</span>
          <span class="ris-girone-progress">${played}/${total}</span>
        </div>
        <div class="ris-girone-matches">${partiteHtml}</div>
        ${_classificaGironeHtml(lettera)}
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ── CLASSIFICA PROVVISORIA DEL GIRONE ─────────────────
// Riusa getClassificaGirone passando i risultati reali (stessa forma dati dei
// pronostici). Le prime due posizioni sono evidenziate come qualificate.
function _classificaGironeHtml(lettera) {
  const classifica = getClassificaGirone(lettera, _risultati.gironi || {}, DB);
  if (!classifica.length) return '';

  const righe = classifica.map((t, i) => {
    const sq = DB.squadre[t.id] || { nome: t.id, flag: '' };
    const gd = t.gd > 0 ? `+${t.gd}` : `${t.gd}`;
    return `
      <tr class="${i < 2 ? 'ris-cl-qual' : ''}">
        <td class="ris-cl-pos">${i + 1}</td>
        <td class="ris-cl-team">${sq.flag} ${sq.nome}</td>
        <td>${t.g}</td>
        <td>${gd}</td>
        <td class="ris-cl-pt">${t.pt}</td>
      </tr>`;
  }).join('');

  return `
    <div class="ris-girone-classifica">
      <div class="ris-cl-title">Classifica provvisoria</div>
      <table class="ris-cl-table">
        <thead>
          <tr><th></th><th>Squadra</th><th title="Partite giocate">G</th><th title="Differenza reti">DR</th><th title="Punti">Pt</th></tr>
        </thead>
        <tbody>${righe}</tbody>
      </table>
    </div>`;
}

// ── CARD LIVE (in corso) ──────────────────────────────
function _cardLive(p) {
  const casa = _sq(p.casa);
  const trasf= _sq(p.trasferta);
  const minuto = p.minuto ? `<span class="live-badge live-badge-pulse">🔴 ${p.minuto}'</span>` : '<span class="live-badge live-badge-pulse">🔴 LIVE</span>';
  const gc = p.gol_casa ?? '?', gt = p.gol_trasferta ?? '?';

  return `
    <div class="match-card match-card-live">
      <div class="match-card-meta">${minuto}</div>
      <div class="match-card-main">
        <div class="match-team">
          <span class="team-flag">${casa.flag}</span>
          <span class="team-nome">${casa.nome}</span>
        </div>
        <span class="live-score">${gc} — ${gt}</span>
        <div class="match-team match-team-away">
          <span class="team-nome">${trasf.nome}</span>
          <span class="team-flag">${trasf.flag}</span>
        </div>
      </div>
    </div>`;
}

// ── CARD OGGI (non ancora iniziata) ──────────────────
function _cardOggi(p) {
  const casa = _sq(p.casa);
  const trasf= _sq(p.trasferta);
  const orario = p.orario ? `<span class="match-time">${formatTime(p.orario)}</span>` : '';
  const hasScore = p.gol_casa != null && p.gol_trasferta != null;
  const scoreHtml = hasScore
    ? `<span class="live-score result-score">${p.gol_casa} — ${p.gol_trasferta}</span>`
    : `<span class="live-score-dash">—</span>`;

  return `
    <div class="match-card">
      <div class="match-card-meta">${orario}</div>
      <div class="match-card-main">
        <div class="match-team">
          <span class="team-flag">${casa.flag}</span>
          <span class="team-nome">${casa.nome}</span>
        </div>
        ${scoreHtml}
        <div class="match-team match-team-away">
          <span class="team-nome">${trasf.nome}</span>
          <span class="team-flag">${trasf.flag}</span>
        </div>
      </div>
    </div>`;
}

// ── CARD PROSSIMA ─────────────────────────────────────
function _cardProssima(p) {
  const casa = _sq(p.casa);
  const trasf= _sq(p.trasferta);
  const data = p.orario ? formatDate(p.orario) : '';

  return `
    <div class="match-card match-card-upcoming">
      <div class="match-card-meta">${data}</div>
      <div class="match-card-main">
        <div class="match-team">
          <span class="team-flag">${casa.flag}</span>
          <span class="team-nome">${casa.nome}</span>
        </div>
        <span class="live-score-dash">—</span>
        <div class="match-team match-team-away">
          <span class="team-nome">${trasf.nome}</span>
          <span class="team-flag">${trasf.flag}</span>
        </div>
      </div>
    </div>`;
}

// ── BADGE NAV ─────────────────────────────────────────
function _aggiornaBadge() {
  const badge = document.getElementById('nav-live-badge');
  if (!badge) return;
  const hasLive = (_liveData.oggi || []).some(p => p.stato === 'IN_PLAY' || p.stato === 'PAUSED');
  badge.style.display = hasLive ? '' : 'none';
}

// ── TIMESTAMP ─────────────────────────────────────────
function _aggiornaTimestamp() {
  const el = document.getElementById('live-updated');
  if (!el || !_liveData.updatedAt) return;
  const d = _liveData.updatedAt.toDate ? _liveData.updatedAt.toDate() : new Date(_liveData.updatedAt);
  el.textContent = `Agg. ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
}

// ── MARCATORI ─────────────────────────────────────────
function _renderMarcatori() {
  const container = document.getElementById('live-marcatori-container');
  if (!container) return;

  if (!_marcatori.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚽</div>
        <p>La classifica marcatori sarà disponibile all'inizio del torneo.</p>
      </div>`;
    return;
  }

  // Mappa squadre id → {nome, flag}, robusta sia che DB.squadre sia array sia oggetto.
  const squadre = Array.isArray(DB.squadre)
    ? Object.fromEntries(DB.squadre.map(s => [s.id, s]))
    : (DB.squadre || {});

  // Ordina per gol (desc), poi assist (desc) per l'ordine di visualizzazione.
  const ordinati = [..._marcatori].sort((a, b) => (b.gol - a.gol) || (b.assist - a.assist));

  // Posizione a pari merito: stesso numero di gol → stessa posizione (es. 1, 2, 2, 4).
  let posCorrente = 0;
  let golPrec = null;
  const conPos = ordinati.map((m, i) => {
    if (m.gol !== golPrec) { posCorrente = i + 1; golPrec = m.gol; }
    return { ...m, pos: posCorrente };
  });

  const rows = conPos.map(m => {
    const sq = squadre[m.squadra_id];
    const flag = sq?.flag || '';
    const squadraNome = sq?.nome || m.squadra_nome || '—';
    const assistHtml = m.assist > 0 ? `<span class="marc-assist" title="Assist">${m.assist} 👟</span>` : '';
    const rigoriHtml = m.rigori > 0 ? `<span class="marc-rigori">(${m.rigori} rig)</span>` : '';
    const medaglia = m.pos === 1 ? '🥇' : m.pos === 2 ? '🥈' : m.pos === 3 ? '🥉' : m.pos;

    return `
      <div class="marc-row${m.pos <= 3 ? ' marc-podio' : ''}">
        <div class="marc-pos">${medaglia}</div>
        <div class="marc-info">
          <div class="marc-nome">${m.nome}</div>
          <div class="marc-squadra">${flag} ${squadraNome}</div>
        </div>
        <div class="marc-stats">
          <span class="marc-gol">${m.gol} ⚽</span>
          ${assistHtml}
          ${rigoriHtml}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="marc-list">
      <div class="marc-header">
        <span>Giocatore</span>
        <span>GOL ⚽ · ASSIST 👟</span>
      </div>
      ${rows}
    </div>`;
}

// ── HELPERS ───────────────────────────────────────────
function _fmtDataBreve(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}
