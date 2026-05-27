# Guida al test locale — Mondialito 2026

Segui questi passi nell'ordine. Ci vogliono circa **10 minuti** la prima volta.

---

## Prerequisiti

- **Node.js 20** installato → https://nodejs.org (versione LTS)
- Connessione internet (serve solo per scaricare i pacchetti la prima volta)

---

## Passo 1 — Installa Firebase CLI

Apri il **Terminale** (Mac) o il **Prompt dei comandi** (Windows) e scrivi:

```bash
npm install -g firebase-tools
```

Verifica che funzioni:

```bash
firebase --version
```

Dovresti vedere un numero tipo `13.x.x`. Se appare un errore, su Windows prova con **Prompt dei comandi come Amministratore**.

---

## Passo 2 — Installa le dipendenze delle Functions

Nella cartella MONDIALITO, esegui:

```bash
cd functions
npm install
cd ..
```

E poi installa firebase-admin per lo script seed:

```bash
npm install firebase-admin
```

---

## Passo 3 — Avvia gli emulatori

Sempre nella cartella MONDIALITO:

```bash
firebase emulators:start --project demo-mondialito
```

Vedrai apparire qualcosa del tipo:

```
✔  All emulators ready!
│ Emulator  │ Host:Port       │
│ Auth      │ localhost:9099  │
│ Functions │ localhost:5001  │
│ Firestore │ localhost:8080  │
│ Hosting   │ localhost:5000  │
│ Emulator UI → http://localhost:4000
```

**Non chiudere questo terminale** — gli emulatori devono rimanere attivi.

---

## Passo 4 — Popola i dati di test

Apri un **secondo terminale** (nella stessa cartella MONDIALITO) e scrivi:

```bash
node seed.js
```

Vedrai le credenziali degli utenti di test stampate a schermo:

```
  admin   Arx Admin <arx.admin@mondialito.app>         [✅ approvato]
  admin   Mario Rossi <mario.rossi@mondialito.app>     [✅ approvato]
  utente  Luca Bianchi <luca.bianchi@mondialito.app>   [✅ approvato]
  utente  Sara Verdi <sara.verdi@mondialito.app>        [✅ approvato]
  utente  Giulia Neri <giulia.neri@mondialito.app>      [✅ approvato]
  utente  Marco Pending <marco.pending@mondialito.app>  [⏳ in attesa]
```

---

## Passo 5 — Apri l'app nel browser

Vai su → **http://localhost:5000**

Nella console del browser (F12 → Console) dovresti vedere:

```
🧪 Modalità TEST — emulatori Firebase attivi
```

Questo conferma che l'app sta parlando con gli emulatori e non con il server reale.

---

## Cosa testare

### ✅ Flusso registrazione
1. Clicca sul tab **Registrati**
2. Inserisci nome, cognome, telefono e una password (minimo 6 caratteri)
3. Clicca **Invia richiesta di accesso**
4. Dovresti vedere la schermata **"Richiesta inviata"** con i tuoi dati

### ✅ Flusso approvazione admin
1. Apri una **seconda finestra del browser in modalità anonima** (Ctrl+Maiusc+N)
2. Vai su http://localhost:5000
3. Accedi come admin: `arx.admin@mondialito.app` / `admin123`
4. Vai su **Admin → Approvazioni**
5. Dovresti vedere la richiesta appena inviata + quella di Marco Pending
6. Clicca **Approva** su una richiesta
7. Torna alla prima finestra — il nuovo utente può ora accedere

### ✅ Flusso utente normale
1. Accedi come `luca.bianchi@mondialito.app` / `test123`
2. Controlla la **Classifica** (dati di esempio già presenti)
3. Vai su **Pronostici** → tab Fase a gironi: alcune partite hanno già un pronostico
4. Vai su **Il mio profilo**

### ✅ Utente in attesa
1. Accedi come `marco.pending@mondialito.app` / `test123`
2. Dovresti vedere la schermata "In attesa di approvazione" e non l'app

---

## Pannello Emulator UI

Mentre gli emulatori girano, puoi aprire:

→ **http://localhost:4000**

Qui puoi vedere e modificare direttamente i documenti Firestore, gli utenti Auth, e i log delle Functions — utile per il debug.

---

## Resetta i dati

Se vuoi ripartire da zero (dati puliti), ferma gli emulatori (Ctrl+C) e riavviali:

```bash
firebase emulators:start --project demo-mondialito
node seed.js   # in un secondo terminale
```

Gli emulatori non salvano nulla su disco tra un avvio e l'altro (a meno che non usi `--export-on-exit`).

---

## Problemi comuni

**"firebase: command not found"**
→ Chiudi e riapri il terminale dopo `npm install -g firebase-tools`. Su Windows, usa il Prompt come Amministratore.

**"Port 5000 already in use"**
→ Cambia la porta hosting nell'emulatore: aggiungi `--only auth,firestore,functions` e usa un server alternativo (es. `npx serve . -p 3000`).

**L'app si apre ma non accade nulla al login**
→ Controlla la console browser (F12) per errori. Verifica che gli emulatori siano ancora in esecuzione nel primo terminale.

**"Cannot find module 'firebase-admin'"**
→ Esegui `npm install firebase-admin` nella cartella MONDIALITO (non dentro /functions).
