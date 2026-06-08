# FICSIT Canteen Java

Applicazione desktop JavaFX che converte il sito FICSIT Canteen in un progetto importabile e modificabile con IntelliJ IDEA.

## Come aprirlo in IntelliJ

1. Apri IntelliJ IDEA.
2. Seleziona `Open`.
3. Scegli la cartella `prova in java`.
4. Attendi il caricamento Maven delle dipendenze JavaFX.
5. Apri `src/main/java/it/ficsit/canteen/App.java`.
6. Premi Run sul metodo `main`, oppure usa il comando Maven `javafx:run`.

Serve Maven o il supporto Maven integrato in IntelliJ, perché JavaFX non è incluso nei JDK moderni.

## Struttura

- `src/main/java/it/ficsit/canteen/App.java`: avvio applicazione.
- `model`: classi dati del dominio.
- `storage`: database simulato centralizzato e persistenza su file.
- `ui`: vecchia interfaccia Swing lasciata come riferimento.
- `src/main/resources/styles/ficsit.css`: grafica JavaFX modificabile come CSS.

## Funzionalita

- Area cliente con menu, prenotazione tavoli 4x4, ordinazione, recensioni e contatti.
- Area admin con dashboard, gestione menu, prenotazioni, ordini e recensioni.
- Dati condivisi tra client e admin tramite `StorageService`.
- Persistenza locale in `%USERPROFILE%/.ficsit-canteen/database.bin`.
