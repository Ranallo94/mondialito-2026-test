/**
 * update-email.js
 * Aggiorna l'email di un utente Mondialito (Auth + Firestore)
 * e invia il link di reset password alla nuova email reale.
 *
 * Uso:
 *   node update-email.js gabriele.grammatico Gabrielegrammatico@gmail.com
 */

const admin = require('firebase-admin');

const [,, slugArg, nuovaEmail] = process.argv;

if (!slugArg || !nuovaEmail) {
  console.error('Uso: node update-email.js nome.cognome nuova@email.com');
  process.exit(1);
}

admin.initializeApp();

const emailVecchia = slugArg.includes('@') ? slugArg : `${slugArg}@mondialito.app`;

async function main() {
  try {
    // 1. Trova utente tramite email fittizia
    const user = await admin.auth().getUserByEmail(emailVecchia);
    const uid  = user.uid;
    console.log(`✓ Utente trovato: ${uid}`);

    // 2. Aggiorna email in Firebase Auth
    await admin.auth().updateUser(uid, { email: nuovaEmail });
    console.log(`✓ Email Auth aggiornata: ${emailVecchia} → ${nuovaEmail}`);

    // 3. Aggiorna email in Firestore
    const db  = admin.firestore();
    await db.collection('partecipanti').doc(uid).update({ email: nuovaEmail });
    console.log(`✓ Email Firestore aggiornata`);

    // 4. Invia reset password alla nuova email
    const resetLink = await admin.auth().generatePasswordResetLink(nuovaEmail);
    console.log(`\n✅ Tutto aggiornato!`);
    console.log(`   Invia questo link a ${nuovaEmail}:`);
    console.log(`\n   ${resetLink}\n`);

  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ Utente non trovato: ${emailVecchia}`);
    } else if (err.code === 'auth/email-already-exists') {
      console.error(`❌ La nuova email è già usata da un altro account.`);
    } else {
      console.error('❌ Errore:', err.message);
    }
    process.exit(1);
  }
}

main();
