# Migrazione LocalStorage -> MariaDB

Questa applicazione funziona offline con LocalStorage, ma il frontend e costruito per non conoscere il database reale. La migrazione deve avvenire solo nel data layer.

## 1. Installare MariaDB

Installare MariaDB Server, creare un utente applicativo dedicato e abilitare connessioni dal backend scelto.

## 2. Creare il database

Importare lo schema:

```sql
SOURCE database/mariadb-schema.sql;
```

## 3. Creare il backend API

Esporre endpoint REST compatibili:

- `GET /api/menu`
- `PUT /api/menu`
- `GET /api/reservations`
- `PUT /api/reservations`
- `GET /api/orders`
- `PUT /api/orders`
- `GET /api/reviews`
- `PUT /api/reviews`
- `GET /api/dashboard/stats`

## 4. Configurare la connessione

Nel backend impostare host, porta, database, utente, password, pool connessioni, timeout e SSL se richiesto.

## 5. Cambiare modalita database

Aggiornare `data/database-config.js`:

```js
export const DATABASE_MODE = "MARIADB";
```

## 6. Sostituire lo storage engine

In `data/storage.js`, sostituire le letture/scritture LocalStorage con chiamate a `data/api/apiClient.js`. Le firme pubbliche devono restare invariate.

## 7. Migrare i dati

Esportare il JSON locale dal browser, trasformarlo in record relazionali e importarlo in MariaDB rispettando le chiavi tra utenti, prenotazioni e ordini.

## 8. Testare la migrazione

Verificare menu, prenotazioni, ordini, recensioni e dashboard aprendo area cliente e area admin in tab diverse. Nessuna pagina HTML deve cambiare.

## 9. Deploy produzione

Servire frontend statico via CDN o web server, proteggere API con HTTPS, sessioni, rate limit e log centralizzati.

## Realtime futuro

Sostituire l'attuale sincronizzazione `storage` con WebSocket, Server Sent Events o MQTT industriale. Il backend emettera eventi come `database:update`, mentre il frontend continuera ad ascoltare lo stesso evento applicativo.
