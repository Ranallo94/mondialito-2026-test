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

  // ── Motore di calcolo: usa l'UNICA fonte di verità (js/punteggi.js) ──
  // Niente più copia inline divergente: importiamo lo stesso motore usato
  // dalla app (leaderboard, profilo, admin), così il ricalcolo manuale resta
  // sempre allineato e include correttamente i punti di 1°/2° posto in griglia.
  const { calcolaPunteggio, calcolaSparegnio } = await import('/js/punteggi.js');

  // ── Calcola punteggi per tutti i partecipanti ─────────
  const lista = [];
  for (const [uid, pr] of Object.entries(pronostici)) {
    if (!partecipanti[uid]) continue; // salta pronostici orfani (utenti eliminati)
    const nome = partecipanti[uid].nome;
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
