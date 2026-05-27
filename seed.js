/**
 * MONDIALITO 2026 — seed.js
 * Popola il Firebase Emulator con dati di test.
 *
 * Esegui DOPO aver avviato gli emulatori:
 *   node seed.js
 */

const { initializeApp }   = require('firebase-admin/app');
const { getAuth }          = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Punta agli emulatori locali
process.env.FIREBASE_AUTH_EMULATOR_HOST      = 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST          = 'localhost:8080';
process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST = 'localhost:5001';

initializeApp({ projectId: 'demo-mondialito' });

const auth = getAuth();
const db   = getFirestore();

// ── UTENTI DI TEST ────────────────────────────────────
const UTENTI = [
  // Admin (già approvati)
  { nome: 'Arx',     cognome: 'Admin',  telefono: '+39 333 000 0001', password: 'admin123', isAdmin: true,  approvato: true  },
  { nome: 'Mario',   cognome: 'Rossi',  telefono: '+39 333 000 0002', password: 'admin123', isAdmin: true,  approvato: true  },
  // Partecipanti approvati
  { nome: 'Luca',    cognome: 'Bianchi',telefono: '+39 333 000 0003', password: 'test123',  isAdmin: false, approvato: true  },
  { nome: 'Sara',    cognome: 'Verdi',  telefono: '+39 333 000 0004', password: 'test123',  isAdmin: false, approvato: true  },
  { nome: 'Giulia',  cognome: 'Neri',   telefono: '+39 333 000 0005', password: 'test123',  isAdmin: false, approvato: true  },
  // Richiesta in attesa (per testare il flusso approvazione)
  { nome: 'Marco',   cognome: 'Pending',telefono: '+39 333 000 0006', password: 'test123',  isAdmin: false, approvato: false },
];

// ── CONFIG SISTEMA ────────────────────────────────────
const SISTEMA = {
  pronostici_aperti:   true,
  prossima_partita:    null,
  ultima_partita_fine: null,
};

// ── PRONOSTICI DI ESEMPIO (Luca Bianchi) ─────────────
// Solo qualche partita compilata per vedere il form pre-riempito
const PRONOSTICI_LUCA = {
  gironi: {
    'A1': { segno: '1', gol_casa: 2, gol_trasferta: 0 },
    'A2': { segno: 'X', gol_casa: 1, gol_trasferta: 1 },
    'A3': { segno: '1', gol_casa: 3, gol_trasferta: 1 },
  },
  capocannoniere: {
    primo:   'Mbappé',
    secondo: 'Haaland',
    terzo:   'Vinicius Jr.',
  },
};

// ── CLASSIFICA DI ESEMPIO ─────────────────────────────
const CLASSIFICA_SNAPSHOT = {
  partecipanti: [
    { id: 'uid-luca',  nome: 'Luca',   cognome: 'Bianchi', totale: 120, breakdown: {}, spareggio: [0,0,0,0,0,2,0,3,1,8,1] },
    { id: 'uid-sara',  nome: 'Sara',   cognome: 'Verdi',   totale: 95,  breakdown: {}, spareggio: [0,0,0,0,0,1,0,2,0,6,0] },
    { id: 'uid-giulia',nome: 'Giulia', cognome: 'Neri',    totale: 80,  breakdown: {}, spareggio: [0,0,0,0,0,0,0,1,0,5,0] },
    { id: 'uid-arx',   nome: 'Arx',    cognome: 'Admin',   totale: 60,  breakdown: {}, spareggio: [0,0,0,0,0,0,0,0,0,4,0] },
    { id: 'uid-mario', nome: 'Mario',  cognome: 'Rossi',   totale: 50,  breakdown: {}, spareggio: [0,0,0,0,0,0,0,0,0,3,0] },
  ],
  updatedAt: new Date(),
};

// ══════════════════════════════════════════════════════
// ESECUZIONE
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('\n🌱 Avvio seed dati di test...\n');

  // Crea utenti
  const uidMap = {};
  for (const u of UTENTI) {
    const slug  = _slug(u.nome) + '.' + _slug(u.cognome);
    const email = `${slug}@mondialito.app`;

    try {
      // Crea utente Auth
      const rec = await auth.createUser({ email, password: u.password });
      uidMap[slug] = rec.uid;

      // Crea doc Firestore
      await db.doc(`partecipanti/${rec.uid}`).set({
        nome:       u.nome,
        cognome:    u.cognome,
        telefono:   u.telefono,
        email,
        isAdmin:    u.isAdmin,
        approvato:  u.approvato,
        richiestaAt: FieldValue.serverTimestamp(),
      });

      const stato = u.approvato ? '✅ approvato' : '⏳ in attesa';
      const ruolo = u.isAdmin   ? '👑 admin'    : '👤 utente';
      console.log(`  ${ruolo}  ${u.nome} ${u.cognome} <${email}>  [${stato}]`);
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        console.log(`  ⚠️  ${email} già esistente — salto`);
      } else {
        console.error(`  ❌ Errore per ${email}:`, e.message);
      }
    }
  }

  // Crea documenti di sistema
  await db.doc('sistema/config').set(SISTEMA, { merge: true });
  console.log('\n  ⚙️  sistema/config creato');

  // Crea classifica di esempio
  await db.doc('classifica/snapshot').set(CLASSIFICA_SNAPSHOT);
  console.log('  🏅 classifica/snapshot creato');

  // Crea pronostici di esempio per Luca
  const lucaEmail = 'luca.bianchi@mondialito.app';
  try {
    const lucaRec = await auth.getUserByEmail(lucaEmail);
    await db.doc(`pronostici/${lucaRec.uid}`).set({
      ...PRONOSTICI_LUCA,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('  📋 pronostici di Luca Bianchi creati');
  } catch (_) {}

  // Crea documento risultati vuoto
  await db.doc('risultati/ufficiali').set({ gironi: {}, updatedAt: new Date() }, { merge: true });
  console.log('  ⚽ risultati/ufficiali inizializzato');

  console.log('\n✅ Seed completato!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Credenziali di test:\n');
  console.log('  Admin:          arx.admin@mondialito.app        / admin123');
  console.log('  Admin:          mario.rossi@mondialito.app      / admin123');
  console.log('  Utente:         luca.bianchi@mondialito.app     / test123');
  console.log('  Utente:         sara.verdi@mondialito.app       / test123');
  console.log('  Utente:         giulia.neri@mondialito.app      / test123');
  console.log('  In attesa:      marco.pending@mondialito.app    / test123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

function _slug(str) {
  return str.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
}

seed().catch(e => { console.error('Errore seed:', e); process.exit(1); });
