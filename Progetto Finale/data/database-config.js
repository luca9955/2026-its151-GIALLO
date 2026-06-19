export const DATABASE_MODE = "MARIADB";

/*
CAMBIO FUTURO:

Sostituire:

LOCAL

con:

MARIADB

Esempio:

export const DATABASE_MODE = "MARIADB";

Dopo questa modifica il frontend dovra continuare a funzionare senza
cambiamenti. Il provider MARIADB dovra delegare a data/api/apiClient.js,
mentre le pagine e i repository manterranno lo stesso contratto pubblico.
*/
