import { DATABASE_MODE } from "../database-config.js";

const endpointMap = {
  "/health": "api/health.php",
  "/database": "api/database.php",
  "/menu": "api/menu.php",
  "/reservations": "api/reservations.php",
  "/orders": "api/orders.php",
  "/reviews": "api/reviews.php",
  "/dashboard/stats": "api/dashboard-stats.php",
};

function resolveEndpoint(endpoint) {
  return endpointMap[endpoint] || `api/${endpoint.replace(/^\/+/, "")}.php`;
}

function ensureXamppMode() {
  if (DATABASE_MODE !== "XAMPP") {
    throw new Error("apiClient e riservato alla modalita XAMPP.");
  }
}

export async function requestJson(endpoint, options = {}) {
  ensureXamppMode();

  /*
  NOTE:
  - aggiungere token/sessione negli header Authorization
  - gestire timeout con AbortController
  - normalizzare errori HTTP e payload MySQL/PHP
  - ritentare le richieste idempotenti quando il server non risponde
  */
  const response = await fetch(resolveEndpoint(endpoint), {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Errore API ${response.status}: ${endpoint}`);
  }

  return response.json();
}

export function requestJsonSync(endpoint, options = {}) {
  ensureXamppMode();

  const method = options.method || "GET";
  const xhr = new XMLHttpRequest();
  xhr.open(method, resolveEndpoint(endpoint), false);
  xhr.setRequestHeader("Content-Type", "application/json");

  const body = options.body ? options.body : null;
  xhr.send(body);

  if (xhr.status < 200 || xhr.status >= 300) {
    throw new Error(`Errore API ${xhr.status}: ${endpoint}`);
  }

  return xhr.responseText ? JSON.parse(xhr.responseText) : null;
}
