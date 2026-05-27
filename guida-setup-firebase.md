# Guida al setup Firebase — Mondialito 2026

Questa guida ti accompagna passo dopo passo dalla creazione del progetto Firebase al deploy live dell'app. Segui i passaggi nell'ordine indicato. Ci vogliono circa **30–45 minuti**.

---

## Prerequisiti

- Account Google (qualsiasi Gmail va bene)
- Node.js installato sul computer (scaricabile da https://nodejs.org — versione 20 LTS)
- Chiave API gratuita di football-data.org (vedi Passo 0)

---

## Passo 0 — Chiave API football-data.org

1. Vai su https://www.football-data.org/client/register
2. Registrati con email e password
3. Ricevi la chiave API via email (campo `X-Auth-Token`)
4. Annotala: ti serve al Passo 6

---

## Passo 1 — Crea il progetto Firebase

1. Vai su https://console.firebase.google.com
2. Clicca **"Aggiungi progetto"**
3. Nome progetto: `mondialito-2026` (o qualsiasi nome tu voglia)
4. **Disabilita** Google Analytics (non serve)
5. Clicca **"Crea progetto"** e aspetta il completamento

---

## Passo 2 — Attiva il piano Blaze (pay-as-you-go)

Le Cloud Functions richiedono il piano Blaze. Non ti verrà addebitato nulla a questi volumi.

1. Nel menu a sinistra, clicca sull'icona **⚙️ Impostazioni progetto → Utilizzo e fatturazione**
2. Clicca **"Modifica piano"** → scegli **Blaze**
3. Aggiungi un metodo di pagamento (carta di credito)
4. Imposta un **budget alert** a €5 per sicurezza (vai su Google Cloud Console → Billing → Budgets)

---

## Passo 3 — Configura Firebase Authentication

1. Nel menu Firebase, vai su **Authentication → Inizia**
2. Clicca su **"Metodo di accesso"**
3. Abilita **Email/password** (il primo della lista)
4. Salva

---

## Passo 4 — Configura Firestore

1. Nel menu, vai su **Firestore Database → Crea database**
2. Scegli **"Inizia in modalità produzione"**
3. Scegli la regione: **`europe-west1` (Belgio)** — è la stessa delle Functions
4. Clicca **"Crea"**

Le regole di sicurezza vengono caricate automaticamente al deploy (vedi Passo 7).

---

## Passo 5 — Ottieni la configurazione Firebase per l'app

1. Vai su **⚙️ Impostazioni progetto → Generale**
2. Scorri fino a **"Le tue app"** e clicca sull'icona `</>`  (web)
3. Nickname app: `mondialito-web`
4. **Non** spuntare Firebase Hosting (lo configuriamo dopo)
5. Clicca **"Registra app"**
6. Copia l'oggetto `firebaseConfig` che appare (contiene apiKey, authDomain, ecc.)

Ora apri il file **`index.html`** nella cartella MONDIALITO e sostituisci il blocco:

```javascript
const firebaseConfig = {
  apiKey: "INSERISCI-API-KEY",
  authDomain: "INSERISCI-AUTH-DOMAIN",
  projectId: "INSERISCI-PROJECT-ID",
  storageBucket: "INSERISCI-STORAGE-BUCKET",
  messagingSenderId: "INSERISCI-MESSAGING-SENDER-ID",
  appId: "INSERISCI-APP-ID"
};
```

con i valori reali che hai copiato dal pannello Firebase.

Apri anche il file **`.firebaserc`** e sostituisci `INSERISCI-PROJECT-ID` con il tuo project ID (es. `mondialito-2026`).

---

## Passo 6 — Installa Firebase CLI e configura la chiave API

Apri il **Terminale** (su Mac) o il **Prompt dei comandi** (su Windows) e digita:

```bash
npm install -g firebase-tools
firebase login
```

Si aprirà il browser: accedi con il tuo account Google.

Poi imposta la chiave API di football-data.org come variabile d'ambiente sicura (Secret Manager):

```bash
firebase functions:secrets:set FOOTBALL_DATA_API_KEY
```

Quando chiede il valore, incolla la chiave API che hai ottenuto al Passo 0 e premi Invio.

---

## Passo 7 — Deploy dell'app

Sempre dal terminale, spostati nella cartella MONDIALITO:

```bash
cd "Desktop/CLAUDE COWORK/MONDIALITO"
```

Installa le dipendenze delle Functions:

```bash
cd functions
npm install
cd ..
```

Esegui il deploy completo:

```bash
firebase deploy
```

Il comando esegue tre operazioni:
- Carica le **regole Firestore** (sicurezza)
- Pubblica le **Cloud Functions** (sync automatico risultati)
- Pubblica il **sito** su Firebase Hosting

Al termine vedrai un URL del tipo `https://mondialito-2026.web.app` — è il tuo Mondialito!

---

## Passo 8 — Crea i partecipanti su Firestore

Per ogni partecipante devi creare un documento nel Firestore e un utente in Firebase Auth.

### Metodo rapido: script di creazione utenti

Crea un file temporaneo `setup-utenti.js` nella cartella MONDIALITO con questo contenuto (da eseguire una sola volta):

```javascript
// setup-utenti.js — esegui con: node setup-utenti.js
// Richiede: npm install firebase-admin

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json'); // vedi sotto

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db   = admin.firestore();

const PARTECIPANTI = [
  // Aggiungi qui tutti i partecipanti
  { id: 'arx',      nome: 'Arx',      password: 'password123', isAdmin: true  },
  { id: 'mario',    nome: 'Mario',     password: 'password123', isAdmin: true  },
  { id: 'luigi',    nome: 'Luigi',     password: 'password123', isAdmin: true  },
  { id: 'giovanni', nome: 'Giovanni',  password: 'password123', isAdmin: true  },
  // Partecipanti normali:
  { id: 'luca',     nome: 'Luca',      password: 'mondialito26', isAdmin: false },
  // ... aggiungi tutti gli altri
];

async function crea() {
  for (const p of PARTECIPANTI) {
    const email = `${p.id}@mondialito.app`;
    try {
      // Crea utente Auth
      const user = await auth.createUser({ uid: p.id, email, password: p.password });
      // Crea documento Firestore
      await db.doc(`partecipanti/${p.id}`).set({ nome: p.nome, isAdmin: p.isAdmin });
      console.log(`✅ ${p.nome} creato`);
    } catch (e) {
      console.log(`⚠️  ${p.nome}: ${e.message}`);
    }
  }
  process.exit(0);
}

crea();
```

Per eseguirlo hai bisogno del **Service Account**:

1. Vai su **⚙️ Impostazioni progetto → Account di servizio**
2. Clicca **"Genera nuova chiave privata"** → scarica il JSON
3. Rinominalo `service-account.json` e mettilo nella cartella MONDIALITO
4. Dal terminale nella cartella MONDIALITO:

```bash
npm install firebase-admin
node setup-utenti.js
```

5. **Cancella** `service-account.json` e `setup-utenti.js` dopo l'uso (contengono credenziali privilegiate).

---

## Passo 9 — Inizializza i documenti Firestore

Vai su **Firestore → Database** nel pannello Firebase e crea manualmente questi documenti:

### Collection `risultati`, documento `ufficiali`
Lascia vuoto (le Cloud Functions lo popolano automaticamente).

### Collection `sistema`, documento `config`
Crea con questi campi:
- `pronostici_aperti`: `true` (boolean)
- `prossima_partita`: `null`
- `ultima_partita_fine`: `null`

### Collection `classifica`, documento `snapshot`
Lascia vuoto (si popola al primo sync risultati).

### Collection `live`, documento `oggi`
Lascia vuoto (si popola al primo sync).

---

## Passo 10 — Verifica finale

1. Apri l'URL dell'app (es. `https://mondialito-2026.web.app`)
2. Seleziona il tuo nome dal dropdown e inserisci la password
3. Dovresti vedere la classifica (vuota per ora) e il form pronostici
4. Vai su **Admin → Sistema → Verifica API**: deve mostrare ✅
5. Clicca **"Sincronizza ora"**: dopo qualche secondo i dati live si aggiornano

---

## Riepilogo credenziali da distribuire

Quando tutto funziona, invia a ciascun partecipante:

> **Mondialito 2026** è online!
> 👉 https://mondialito-2026.web.app
>
> Per entrare:
> — Seleziona il tuo nome dal menu a tendina
> — Password: `[la password che hai impostato per lui]`
>
> Compila i pronostici entro l'11 giugno 2026 (ore 18:00 — kick-off prima partita).

---

## Problemi comuni

**"Permission denied" su Firestore**
→ Assicurati di aver eseguito `firebase deploy` che carica le regole in `firestore.rules`.

**Le Cloud Functions non si attivano**
→ Verifica che il piano Blaze sia attivo e che la chiave API sia salvata come secret.

**Il dropdown login è vuoto**
→ Lo script `setup-utenti.js` non è stato eseguito correttamente. Riprova.

**"INSERISCI-API-KEY" appare in console**
→ Hai dimenticato di sostituire i placeholder in `index.html`. Riapri il file e correggi.

---

*Documento generato automaticamente — Mondialito 2026*
