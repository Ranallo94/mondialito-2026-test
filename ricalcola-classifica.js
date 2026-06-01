/**
 * MONDIALITO 2026 — Ricalcolo Classifica manuale
 * ────────────────────────────────────────────────
 * Incolla nella console del browser (F12 → Console) mentre sei loggato come admin.
 *
 * Legge tutti i pronostici + risultati da Firestore,
 * ricalcola i punteggi con la stessa logica di punteggi.js
 * e scrive il risultato in classifica/snapshot.
 *
 * Prerequisito: regola Firestore classifica deve essere
 *   allow write: if isAdmin();
 */

(async () => {
  const {
    collection, getDocs, doc, getDoc, setDoc, serverTimestamp,
  } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

  const db = window._firebase?.db;
  if (!db) { console.error('❌ Firebase non disponibile. Sei loggato?'); return; }

  console.log('⚙️  Ricalcolo classifica in corso…');

  // ── Carica dati ──────────────────────────────────────
  const [partSnap, proSnap, risSnap] = await Promise.all([
    getDocs(collection(db, 'partecipanti')),
    getDocs(collection(db, 'pronostici')),
    getDoc(doc(db, 'risultati', 'ufficiali')),
  ]);

  const partecipanti = {};
  partSnap.forEach(d => {
    const data = d.data();
    if (data.disabilitato) return; // escludi disabilitati dalla classifica
    const displayName = data.nickname || [data.nome, data.cognome].filter(Boolean).join(' ') || d.id;
    partecipanti[d.id] = { ...data, nome: displayName };
  });

  const pronostici = {};
  proSnap.forEach(d => { pronostici[d.id] = d.data(); });

  const risultati = risSnap.exists() ? risSnap.data() : {};

  console.log(`✓ Partecipanti: ${Object.keys(partecipanti).length}`);
  console.log(`✓ Pronostici:   ${Object.keys(pronostici).length}`);
  console.log(`✓ Risultati gironi: ${Object.keys(risultati.gironi || {}).length}/72`);

  // ── Carica DB partite ─────────────────────────────────
  const dbResp = await fetch('/mondialito_db.json');
  const DB = await dbResp.json();
  const REG = DB.regolamento.punteggi;

  // ── Calcolo punteggi (identico a punteggi.js) ────────
  function _segno(gc, gt) {
    if (gc == null || gt == null) return null;
    return gc > gt ? '1' : gc < gt ? '2' : 'X';
  }

  function calcolaPunteggio(pr, ris) {
    const bd = {
      gironi_segno:   { punti: 0, corretti: 0, totale: 0 },
      gironi_esatto:  { punti: 0, corretti: 0, totale: 0 },
      posto_griglia:  { punti: 0, corretti: 0, totale: 0 },
      sedicesimi:     { punti: 0, corretti: 0 },
      ottavi:         { punti: 0, corretti: 0 },
      quarti:         { punti: 0, corretti: 0 },
      semifinali:     { punti: 0, corretti: 0 },
      finale:         { punti: 0, corretti: 0 },
      vincitore:      { punti: 0, corretto: false },
      modalita:       { punti: 0, corretti: 0 },
      capocannoniere: { punti: 0, dettaglio: '' },
    };

    const rGironi  = ris?.gironi                    || {};
    const rElim    = ris?.fase_eliminatoria          || {};
    const rGriglia = ris?.posizioni_finali_gironi    || {};
    const rCannon  = ris?.capocannoniere_finale      || {};
    const pGironi  = pr?.gironi                      || {};
    const pPosiz   = pr?.posizioni_girone            || {};
    const pElim    = pr?.fase_eliminatoria           || {};
    const pCannon  = pr?.capocannoniere              || {};

    // 1. Gironi
    Object.values(DB.gironi).forEach(girone => {
      girone.partite.forEach(partita => {
        const r = rGironi[partita.id];
        const p = pGironi[partita.id];
        if (!r || r.gol_casa == null || !p) return;
        bd.gironi_segno.totale++;
        bd.gironi_esatto.totale++;
        const segnoR = _segno(r.gol_casa, r.gol_trasferta);
        if (p.segno === segnoR) {
          bd.gironi_segno.punti   += REG.girone.segno_1X2;
          bd.gironi_segno.corretti++;
          if (p.gol_casa == r.gol_casa && p.gol_trasferta == r.gol_trasferta) {
            bd.gironi_esatto.punti   += REG.girone.risultato_esatto_bonus;
            bd.gironi_esatto.corretti++;
          }
        }
      });
    });

    // 2. Griglia
    const sedAvanzate = new Set(
      Object.values((rElim['sedicesimi'] && rElim['sedicesimi'].partite) || {})
        .flatMap(p => [p.casa, p.trasferta]).filter(Boolean)
    );
    Object.entries(rGriglia).forEach(([lettera, posizioni]) => {
      const pPos = pPosiz[lettera];
      if (!pPos || !posizioni.length) return;
      posizioni.forEach((squadra, i) => {
        if (!sedAvanzate.has(squadra)) return;
        if (pPos[i] === squadra) {
          bd.posto_griglia.punti   += REG.posto_in_griglia.punti_per_posizione_corretta;
          bd.posto_griglia.corretti++;
        }
      });
    });

    // 3. Fasi eliminatorie
    const fasi = [
      { key: 'sedicesimi', field: bd.sedicesimi, pti: REG.fasi_eliminatorie.sedicesimi },
      { key: 'ottavi',     field: bd.ottavi,     pti: REG.fasi_eliminatorie.ottavi },
      { key: 'quarti',     field: bd.quarti,     pti: REG.fasi_eliminatorie.quarti },
      { key: 'semifinali', field: bd.semifinali, pti: REG.fasi_eliminatorie.semifinali },
      { key: 'finale',     field: bd.finale,     pti: REG.fasi_eliminatorie.finale },
    ];

    fasi.forEach(({ key, field, pti }) => {
      const rFase = rElim[key] || {};
      const pFase = pElim[key] || {};
      const squadreR = new Set(
        Object.values(rFase).flatMap(m => [m?.casa, m?.trasferta, m?.vincitore]).filter(Boolean)
      );
      const squadreP = Object.values(pFase).map(m => m?.vincitore).filter(Boolean);

      if (key !== 'finale') {
        squadreP.forEach(sq => {
          if (squadreR.has(sq)) { field.punti += pti; field.corretti++; }
        });
      }

      if (key === 'finale') {
        const finalR = (rElim.finale && rElim.finale.partita) || {};
        const finalP = pElim.finale || {};
        [finalR.casa, finalR.trasferta].filter(Boolean).forEach(sq => {
          if (finalP.squadre && finalP.squadre.includes(sq)) {
            field.punti += REG.fasi_eliminatorie.finale;
            field.corretti++;
          }
        });
      }

      Object.entries(rFase).forEach(([matchId, rMatch]) => {
        if (!rMatch?.modalita) return;
        const pMatch = pFase[matchId];
        if (!pMatch) return;
        if (pMatch.modalita === rMatch.modalita && pMatch.vincitore === rMatch.vincitore) {
          bd.modalita.punti   += REG.fasi_eliminatorie.modalita_passaggio_turno.punti;
          bd.modalita.corretti++;
        }
      });
    });

    // 4. Vincitore torneo
    const vincitoreR = rElim.finale?.risultato?.vincitore;
    if (vincitoreR && pElim.finale?.vincitore === vincitoreR) {
      bd.vincitore.punti    = REG.fasi_eliminatorie.vincitore_torneo;
      bd.vincitore.corretto = true;
    }

    // 5. Capocannoniere
    const cp1 = rCannon.primo; const cp2 = rCannon.secondo; const cp3 = rCannon.terzo;
    const pp1 = pCannon.primo; const pp2 = pCannon.secondo; const pp3 = pCannon.terzo;
    const ternaR = [cp1, cp2, cp3].filter(Boolean);
    const ternaP = [pp1, pp2, pp3].filter(Boolean);
    if (cp1 && pp1 === cp1) { bd.capocannoniere.punti += REG.capocannoniere.primo_classificato;   bd.capocannoniere.dettaglio += '1°✓ '; }
    if (cp2 && pp2 === cp2) { bd.capocannoniere.punti += REG.capocannoniere.secondo_classificato; bd.capocannoniere.dettaglio += '2°✓ '; }
    if (cp3 && pp3 === cp3) { bd.capocannoniere.punti += REG.capocannoniere.terzo_classificato;   bd.capocannoniere.dettaglio += '3°✓ '; }
    const nellaTerna = ternaP.filter(p => ternaR.includes(p) && p !== pp1 && p !== pp2 && p !== pp3);
    if (nellaTerna.length) { bd.capocannoniere.punti += REG.capocannoniere.nella_terna; bd.capocannoniere.dettaglio += 'terna✓'; }

    const totale = Object.values(bd).reduce((s, v) => s + (typeof v.punti === 'number' ? v.punti : 0), 0);
    return { totale, breakdown: bd };
  }

  function calcolaSparegnio(pr, ris) {
    const { breakdown: bd } = calcolaPunteggio(pr, ris);
    const rElim   = ris?.fase_eliminatoria   || {};
    const pElim   = pr?.fase_eliminatoria    || {};
    const rCannon = ris?.capocannoniere_finale || {};
    const pCannon = pr?.capocannoniere        || {};
    const vincR  = rElim.finale?.risultato?.vincitore;
    const ternaR = [rCannon.primo, rCannon.secondo, rCannon.terzo].filter(Boolean);
    const pp1    = pCannon.primo;
    return [
      vincR && pElim.finale?.vincitore === vincR ? 1 : 0,
      bd.finale.corretti,
      bd.semifinali.corretti,
      bd.quarti.corretti,
      bd.ottavi.corretti,
      bd.gironi_esatto.corretti,
      vincR && pp1 === rCannon.primo ? 1 : 0,
      bd.posto_griglia.corretti,
      [pCannon.primo, pCannon.secondo, pCannon.terzo].filter(p => ternaR.includes(p)).length,
      bd.gironi_segno.corretti,
      bd.modalita.corretti,
    ];
  }

  // ── Calcola punteggi per tutti i partecipanti ─────────
  const lista = [];
  for (const [uid, pr] of Object.entries(pronostici)) {
    const nome = partecipanti[uid]?.nome || uid;
    const { totale, breakdown } = calcolaPunteggio(pr, risultati);
    const spareggio = calcolaSparegnio(pr, risultati);
    lista.push({ id: uid, nome, totale, breakdown, spareggio });
  }

  // Ordina
  lista.sort((a, b) => {
    if (b.totale !== a.totale) return b.totale - a.totale;
    for (let i = 0; i < Math.max(a.spareggio.length, b.spareggio.length); i++) {
      if ((b.spareggio[i] || 0) !== (a.spareggio[i] || 0)) return (b.spareggio[i] || 0) - (a.spareggio[i] || 0);
    }
    return (a.nome || '').localeCompare(b.nome || '', 'it');
  });

  // ── Scrivi classifica/snapshot ────────────────────────
  await setDoc(doc(db, 'classifica', 'snapshot'), {
    partecipanti: lista,
    updatedAt:    new Date().toISOString(),
  });

  console.log(`\n✅ Classifica aggiornata! ${lista.length} partecipanti`);
  console.table(lista.map((p, i) => ({
    Pos:     i + 1,
    Nome:    p.nome,
    Totale:  p.totale,
    Gironi:  (p.breakdown.gironi_segno?.punti || 0) + (p.breakdown.gironi_esatto?.punti || 0),
    Segni:   p.breakdown.gironi_segno?.corretti || 0,
    Esatti:  p.breakdown.gironi_esatto?.corretti || 0,
  })));
  console.info('ℹ️  Ricarica la pagina Classifica per vedere i risultati.');
})();
