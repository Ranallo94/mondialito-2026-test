/**
 * MONDIALITO 2026 — admin.js
 * Pannello amministratore:
 * - Tab Approvazioni: approva/rifiuta nuovi iscritti
 * - Tab Risultati: verifica e correzione risultati partite
 * - Tab Partecipanti: stato schede pronostici
 * - Tab Sistema: sync manuale, apertura/chiusura pronostici, stato API
 */

import DB from '../mondialito_db.json' with { type: 'json' };
import { STATE } from './app.js';
import {
  getRisultati, patchRisultati,
  getPartecipanti, getPronostici,
  getSistema, updateSistema,
  onRisultatiSnapshot,
} from './db.js';
import { showToast, openModal, closeModal, showSpinner, formatDate } from './ui.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc, query, where,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const db = () => window._firebase.db;

// ── INIT ──────────────────────────────────────────────
export async function initAdmin() {
  if (!STATE.utente?.isAdmin) return;

  showSpinner('admin-risultati-container', 'Caricamento risultati…');
  showSpinner('admin-partecipanti-container', 'Caricamento partecipanti…');

  await Promise.all([
    _initTabApprovazioni(),
    _initTabRisultati(),
    _initTabPartecipanti(),
    _initTabSistema(),
  ]);
}

// ── TAB APPROVAZIONI ──────────────────────────────────
let _unsubApprov = null;

async function _initTabApprovazioni() {
  const container = document.getElementById('admin-approvazioni-container');
  if (!container) return;

  // Ascolta in real-time le richieste in attesa
  _unsubApprov = onSnapshot(
    query(collection(db(), 'partecipanti'), where('approvato', '==', false)),
    (snap) => {
      _renderApprovazioni(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Aggiorna badge contatore nel tab
      const badge = document.getElementById('approv-badge');
      if (badge) {
        badge.textContent = snap.size;
        badge.style.display = snap.size > 0 ? '' : 'none';
      }
    }
  );
}

function _renderApprovazioni(richieste) {
  const container = document.getElementById('admin-approvazioni-container');
  if (!container) return;

  if (!richieste.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <p>Nessuna richiesta in attesa.</p>
      </div>`;
    return;
  }

  const rows = richieste.map(r => {
    const data = r.richiestaAt?.toDate
      ? r.richiestaAt.toDate().toLocaleString('it-IT')
      : '—';
    return `
      <div class="approv-card" id="approv-${r.id}">
        <div class="approv-info">
          <div class="approv-nome">${r.nome} ${r.cognome || ''}</div>
          <div class="approv-meta">
            📱 ${r.telefono || '—'}
            &nbsp;·&nbsp;
            ✉️ ${r.email || '—'}
            &nbsp;·&nbsp;
            🕐 ${data}
          </div>
        </div>
        <div class="approv-actions">
          <button class="btn btn-sm btn-primary" onclick="window._approva('${r.id}', '${(r.nome + ' ' + (r.cognome||'')).trim()}')">
            ✅ Approva
          </button>
          <button class="btn btn-sm btn-danger" onclick="window._rifiuta('${r.id}', '${(r.nome + ' ' + (r.cognome||'')).trim()}')">
            ❌ Rifiuta
          </button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="info-banner info-banner--yellow" style="margin-bottom:16px">
      <span>🔔</span>
      <span><strong>${richieste.length}</strong> richiesta${richieste.length > 1 ? 'e' : ''} in attesa di approvazione.</span>
    </div>
    <div class="approv-list">${rows}</div>`;

  // Bind globali
  window._approva = async (uid, nome) => {
    try {
      await updateDoc(doc(db(), 'partecipanti', uid), { approvato: true });
      showToast(`${nome} approvato! ✅`, 'success');
    } catch (e) {
      showToast('Errore: ' + e.message, 'error');
    }
  };

  window._rifiuta = (uid, nome) => {
    openModal({
      title: 'Rifiuta richiesta',
      body: `<p>Vuoi rifiutare ed eliminare la richiesta di <strong>${nome}</strong>? L'operazione è irreversibile.</p>`,
      buttons: [
        {
          label: 'Sì, rifiuta',
          cls: 'btn btn-danger',
          onClick: async () => {
            try {
              await deleteDoc(doc(db(), 'partecipanti', uid));
              // Elimina anche l'utente Auth tramite callable function
              const fn = httpsCallable(window._firebase.functions, 'eliminaUtente');
              await fn({ uid }).catch(() => {}); // non blocca se fallisce
              showToast(`Richiesta di ${nome} rifiutata.`, 'info');
              closeModal();
            } catch (e) {
              showToast('Errore: ' + e.message, 'error');
            }
          },
        },
        { label: 'Annulla', cls: 'btn btn-secondary', onClick: closeModal },
      ],
    });
  };
}

// ── TAB RISULTATI ─────────────────────────────────────
let _unsubRis = null;

async function _initTabRisultati() {
  _unsubRis = onRisultatiSnapshot((ris) => {
    _renderRisultati(ris);
  });
}

function _renderRisultati(risultati) {
  const container = document.getElementById('admin-risultati-container');
  if (!container) return;

  const rGironi = risultati?.gironi || {};
  let html = '';

  Object.entries(DB.gironi).forEach(([lettera, girone]) => {
    const partiteHtml = girone.partite.map(p => {
      const r = rGironi[p.id] || {};
      const casa  = DB.squadre[p.casa];
      const trasf = DB.squadre[p.trasferta];
      const hasResult = r.gol_casa != null && r.gol_trasferta != null;

      return `
        <div class="admin-match-row" data-id="${p.id}">
          <div class="admin-match-teams">
            ${casa?.flag || ''} ${casa?.nome || p.casa}
            <span class="admin-score ${hasResult ? 'score-set' : 'score-tbd'}">
              ${hasResult ? `${r.gol_casa} — ${r.gol_trasferta}` : '—'}
            </span>
            ${trasf?.nome || p.trasferta} ${trasf?.flag || ''}
          </div>
          <div class="admin-match-actions">
            <span class="admin-api-badge ${hasResult ? 'badge-ok' : 'badge-pending'}">
              ${hasResult ? '✅ API' : '⏳ In attesa'}
            </span>
            <button class="btn btn-sm btn-secondary" onclick="window._adminEditMatch('${p.id}', 'gironi')">
              ✏️ Correggi
            </button>
          </div>
        </div>`;
    }).join('');

    html += `
      <div class="admin-girone-block">
        <div class="admin-girone-header">Girone ${lettera}</div>
        ${partiteHtml}
      </div>`;
  });

  container.innerHTML = html || '<p class="text-muted">Nessuna partita.</p>';

  // Bind globale per i pulsanti correggi (genera modal)
  window._adminEditMatch = (matchId, tipo) => _apriModalCorreggi(matchId, tipo, risultati);
}

function _apriModalCorreggi(matchId, tipo, risultati) {
  const r = risultati?.gironi?.[matchId] || {};

  // Trova la partita nel DB
  let partita = null;
  for (const [, girone] of Object.entries(DB.gironi)) {
    partita = girone.partite.find(p => p.id === matchId);
    if (partita) break;
  }

  if (!partita) {
    showToast('Partita non trovata.', 'error');
    return;
  }

  const casa  = DB.squadre[partita.casa];
  const trasf = DB.squadre[partita.trasferta];

  openModal({
    title: `Correggi risultato`,
    body: `
      <div class="modal-match-title">
        ${casa?.flag || ''} ${casa?.nome || partita.casa}
        &nbsp;vs&nbsp;
        ${trasf?.nome || partita.trasferta} ${trasf?.flag || ''}
      </div>
      <div class="modal-form">
        <div class="field-group">
          <label class="field-label">Gol ${casa?.nome || 'Casa'}</label>
          <input type="number" id="modal-gol-casa" class="field-input" min="0" max="30"
            value="${r.gol_casa ?? ''}">
        </div>
        <div class="field-group">
          <label class="field-label">Gol ${trasf?.nome || 'Trasferta'}</label>
          <input type="number" id="modal-gol-trasf" class="field-input" min="0" max="30"
            value="${r.gol_trasferta ?? ''}">
        </div>
        <p class="modal-note">⚠️ Questo sovrascrive il dato automatico da API.</p>
      </div>`,
    buttons: [
      {
        label: 'Salva',
        cls: 'btn btn-primary',
        onClick: async () => {
          const gc = parseInt(document.getElementById('modal-gol-casa').value);
          const gt = parseInt(document.getElementById('modal-gol-trasf').value);

          if (isNaN(gc) || isNaN(gt)) {
            showToast('Inserisci entrambi i gol.', 'error');
            return;
          }

          try {
            await patchRisultati({
              [`gironi.${matchId}.gol_casa`]: gc,
              [`gironi.${matchId}.gol_trasferta`]: gt,
              [`gironi.${matchId}.fonte`]: 'admin_manual',
              [`gironi.${matchId}.updatedAt`]: new Date().toISOString(),
            });
            showToast('Risultato aggiornato!', 'success');
            closeModal();
          } catch (e) {
            showToast('Errore: ' + e.message, 'error');
          }
        },
      },
      { label: 'Annulla', cls: 'btn btn-secondary', onClick: closeModal },
    ],
  });
}

// ── TAB PARTECIPANTI ──────────────────────────────────
async function _initTabPartecipanti() {
  const container = document.getElementById('admin-partecipanti-container');
  if (!container) return;

  try {
    const partecipanti = await getPartecipanti();

    // Carica stato schede
    const schede = await Promise.all(
      partecipanti.map(async (p) => {
        const pr = await getPronostici(p.id);
        return { ...p, haPronostici: !!pr, updatedAt: pr?.updatedAt };
      })
    );

    const rows = schede.map(p => {
      const stato = p.haPronostici
        ? `<span class="badge-ok">✅ Compilata</span>`
        : `<span class="badge-pending">⏳ Non compilata</span>`;

      const aggiornato = p.updatedAt?.toDate
        ? p.updatedAt.toDate().toLocaleString('it-IT')
        : p.updatedAt || '—';

      return `
        <div class="admin-partecipante-row">
          <div class="ap-info">
            <span class="ap-nome">${p.nome}${p.isAdmin ? ' <span class="badge-admin">Admin</span>' : ''}</span>
            <span class="ap-stato">${stato}</span>
            ${p.haPronostici ? `<span class="ap-date">Salvato: ${aggiornato}</span>` : ''}
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="admin-partecipanti-header">
        ${partecipanti.length} partecipanti —
        ${schede.filter(p => p.haPronostici).length} schede compilate
      </div>
      <div class="admin-partecipanti-list">${rows}</div>`;

  } catch (e) {
    container.innerHTML = `<p class="text-muted">Errore caricamento: ${e.message}</p>`;
  }
}

// ── TAB SISTEMA ───────────────────────────────────────
async function _initTabSistema() {
  try {
    const cfg = await getSistema();

    // Stato pronostici
    const statusEl = document.getElementById('sistema-pronostici-status');
    if (statusEl) {
      statusEl.textContent = cfg.pronostici_aperti !== false
        ? '✅ Aperti — i partecipanti possono modificare'
        : '🔒 Chiusi — il torneo è iniziato';
    }

    // Pulsante apri/chiudi
    const btnToggle = document.getElementById('btn-toggle-pronostici');
    if (btnToggle) {
      btnToggle.addEventListener('click', async () => {
        const nuovoStato = cfg.pronostici_aperti === false ? true : false;
        try {
          await updateSistema({ pronostici_aperti: nuovoStato });
          cfg.pronostici_aperti = nuovoStato;
          if (statusEl) {
            statusEl.textContent = nuovoStato
              ? '✅ Aperti — i partecipanti possono modificare'
              : '🔒 Chiusi — il torneo è iniziato';
          }
          showToast(nuovoStato ? 'Pronostici aperti!' : 'Pronostici chiusi!', 'success');
        } catch (e) {
          showToast('Errore: ' + e.message, 'error');
        }
      });
    }

    // Sync manuale
    const btnSync = document.getElementById('btn-sync-now');
    if (btnSync) {
      btnSync.addEventListener('click', async () => {
        btnSync.disabled = true;
        btnSync.textContent = '⏳ Sincronizzazione…';
        try {
          const fn = httpsCallable(window._firebase.functions, 'syncManuale');
          await fn();
          showToast('Sincronizzazione completata!', 'success');
        } catch (e) {
          showToast('Errore sync: ' + e.message, 'error');
        } finally {
          btnSync.disabled = false;
          btnSync.textContent = 'Sincronizza ora';
        }
      });
    }

    // Stato API
    const apiEl = document.getElementById('sistema-api-status');
    const btnApi = document.getElementById('btn-check-api');
    if (btnApi && apiEl) {
      btnApi.addEventListener('click', async () => {
        apiEl.textContent = '⏳ Verifica in corso…';
        try {
          const fn = httpsCallable(window._firebase.functions, 'checkApiStatus');
          const res = await fn();
          apiEl.textContent = res.data?.ok ? '✅ API raggiungibile' : '❌ API non raggiungibile';
        } catch (e) {
          apiEl.textContent = '❌ Errore: ' + e.message;
        }
      });
    }

  } catch (e) {
    console.warn('Errore init sistema:', e);
  }
}
