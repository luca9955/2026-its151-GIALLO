# FICSIT Canteen

Progetto statico HTML5, CSS3 e JavaScript Vanilla ES6 ispirato a SATISFACTORY/FICSIT.

## Avvio

Apri `home.html` con un server statico locale. Gli ES modules sono progettati per funzionare via HTTP.

Esempio con un qualsiasi server statico:

```bash
cd ficsit-ristorante
npx serve .
```

## Pagine

- Area cliente: `home.html`, `menu.html`, `prenotazione.html`, `ordinazione.html`, `recensioni.html`, `contatti.html`
- Area admin: `admin/principale.html`
- Layer dati condiviso: `data/storage.js`

## Dati

Tutte le operazioni passano da `data/storage.js` e usano `localStorage` come database simulato. La sincronizzazione usa `window.addEventListener("storage")` e un evento interno per aggiornare anche la tab corrente.
