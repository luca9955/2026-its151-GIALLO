import { DATABASE_MODE } from "../database-config.js";

const API_BASE_URL = "/api";

function ensureMariaDbMode() {
  if (DATABASE_MODE !== "MARIADB") {
    throw new Error("apiClient e riservato alla modalita MARIADB.");
  }
}

export async function requestJson(endpoint, options = {}) {
  ensureMariaDbMode();

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

export function requestJsonSync(endpoint, options = {}) {
  ensureMariaDbMode();

  const method = options.method || "GET";
  const xhr = new XMLHttpRequest();
  xhr.open(method, `${API_BASE_URL}${endpoint}`, false);
  xhr.setRequestHeader("Content-Type", "application/json");

  const body = options.body ? options.body : null;
  xhr.send(body);

  if (xhr.status < 200 || xhr.status >= 300) {
    throw new Error(`Errore API ${xhr.status}: ${endpoint}`);
  }

  return xhr.responseText ? JSON.parse(xhr.responseText) : null;
}
