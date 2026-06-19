import { DATABASE_MODE } from "../database-config.js";

const API_BASE_URL = "/api";

export async function requestJson(endpoint, options = {}) {
  if (DATABASE_MODE !== "MARIADB") {
    throw new Error("apiClient e riservato alla modalita MARIADB futura.");
  }

  /*
  FUTURA IMPLEMENTAZIONE:
  - aggiungere token/sessione negli header Authorization
  - gestire timeout con AbortController
  - normalizzare errori HTTP e payload MariaDB
  - ritentare le richieste idempotenti quando il server non risponde
  */
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Errore API ${response.status}: ${endpoint}`);
  }

  return response.json();
}
