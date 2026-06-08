# FICSIT Canteen Java

Applicazione desktop Java Swing che converte il sito FICSIT Canteen in un progetto importabile e modificabile con IntelliJ IDEA.

## Come aprirlo in IntelliJ

1. Apri IntelliJ IDEA.
2. Seleziona `Open`.
3. Scegli la cartella `prova in java`.
4. Apri `src/main/java/it/ficsit/canteen/App.java`.
5. Premi Run sul metodo `main`.

Non servono Maven, Gradle o librerie esterne.

## Struttura

- `src/main/java/it/ficsit/canteen/App.java`: avvio applicazione.
- `model`: classi dati del dominio.
- `storage`: database simulato centralizzato e persistenza su file.
- `ui`: interfaccia grafica Swing client/admin.

## Funzionalita

- Area cliente con menu, prenotazione tavoli 4x4, ordinazione, recensioni e contatti.
- Area admin con dashboard, gestione menu, prenotazioni, ordini e recensioni.
- Dati condivisi tra client e admin tramite `StorageService`.
- Persistenza locale in `%USERPROFILE%/.ficsit-canteen/database.bin`.
