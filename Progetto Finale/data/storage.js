import { DATABASE_MODE } from "./database-config.js";
import { requestJsonSync } from "./api/apiClient.js";

const DB_KEY = "ficsitRestaurantDatabase";
const DB_VERSION = 1;

const defaultMenu = [
  {
    id: "MENU-001",
    name: "Assembler Burger",
    category: "Moduli Caldi",
    description: "Doppio smash burger, cheddar fuso, cipolla caramellata e salsa arancio industriale.",
    price: 15.5,
    image: "assets/images/menu/assembler-burger.png",
    available: true,
  },
  {
    id: "MENU-002",
    name: "Conveyor Ribs",
    category: "Linea Proteica",
    description: "Costine glassate a bassa temperatura con riduzione affumicata e chips di patate.",
    price: 21,
    image: "assets/images/menu/conveyor-ribs.png",
    available: true,
  },
  {
    id: "MENU-003",
    name: "Power Slug Salad",
    category: "Biomassa Premium",
    description: "Insalata croccante con avocado, semi tostati, lime e dressing verde luminoso.",
    price: 12,
    image: "assets/images/menu/power-slug-salad.png",
    available: true,
  },
  {
    id: "MENU-004",
    name: "Foundry Carbonara",
    category: "Pasta Fusa",
    description: "Carbonara cremosa con guanciale croccante e pepe tostato su piatto in acciaio.",
    price: 14,
    image: "assets/images/menu/foundry-carbonara.png",
    available: true,
  },
  {
    id: "MENU-005",
    name: "Space Elevator Sundae",
    category: "Dessert Logistici",
    description: "Gelato vaniglia, crumble cacao, caramello salato e granella arancio.",
    price: 8,
    image: "assets/images/menu/space-elevator-sundae.png",
    available: true,
  },
];

const defaultDatabase = {
  version: DB_VERSION,
  menu: defaultMenu,
  reservations: [],
  orders: [],
  reviews: [
    {
      id: "REV-SEED-001",
      customerName: "Ada",
      stars: 5,
      comment: "Interfaccia operativa impeccabile e burger calibrato al millimetro.",
      createdAt: new Date().toISOString(),
    },
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readDatabase() {
  if (DATABASE_MODE === "MARIADB") {
    return requestJsonSync("/database");
  }

  /*
  ATTUALE IMPLEMENTAZIONE:
  Recupera l'intero database simulato da LocalStorage con chiave unica.

  MIGRAZIONE FUTURA MARIADB:
  1) Sostituire questa lettura con chiamate API mirate tramite apiClient.js.
  2) Ogni repository potra chiamare endpoint come GET /api/menu o GET /api/orders.
  3) Il backend dovra tradurre le righe MariaDB nello stesso formato JSON usato dal frontend.
  4) Gli errori server andranno trasformati in messaggi applicativi coerenti.
  5) Gestire autenticazione, timeout e retry nel data layer, non nella UI.
  */
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    return clone(defaultDatabase);
  }

  try {
    return { ...clone(defaultDatabase), ...JSON.parse(raw) };
  } catch (error) {
    console.warn("Database locale corrotto, ripristino seed.", error);
    return clone(defaultDatabase);
  }
}

function writeDatabase(nextDatabase) {
  if (DATABASE_MODE === "MARIADB") {
    requestJsonSync("/database", {
      method: "PUT",
      body: JSON.stringify({
        menu: clone(nextDatabase.menu || []),
        reservations: clone(nextDatabase.reservations || []),
        orders: clone(nextDatabase.orders || []),
        reviews: clone(nextDatabase.reviews || []),
      }),
    });
    emitDatabaseUpdate();
    return;
  }

  /*
  ATTUALE IMPLEMENTAZIONE:
  Serializza l'intero documento JSON dentro LocalStorage.

  MIGRAZIONE FUTURA MARIADB:
  1) Sostituire la scrittura globale con endpoint REST granulari.
  2) Esempi:
     - PUT /api/menu
     - PUT /api/reservations
     - PUT /api/orders
     - PUT /api/reviews
  3) Il backend dovra eseguire INSERT, UPDATE o DELETE dentro transazioni SQL.
  4) La UI non dovra cambiare: cambiera solo questo provider.
  */
  localStorage.setItem(DB_KEY, JSON.stringify({ ...nextDatabase, version: DB_VERSION }));
  emitDatabaseUpdate();
}

function migrateDefaultVisualAssets() {
  const db = readDatabase();
  let changed = false;
  const visualMap = {
    "MENU-001": "assets/images/menu/assembler-burger.png",
    "MENU-002": "assets/images/menu/conveyor-ribs.png",
    "MENU-003": "assets/images/menu/power-slug-salad.png",
    "MENU-004": "assets/images/menu/foundry-carbonara.png",
    "MENU-005": "assets/images/menu/space-elevator-sundae.png",
  };
  const replaceableImages = new Set([
    "assets/images/menu-line.svg",
    "assets/images/generated-burger.png",
    "assets/images/generated-ribs.png",
  ]);

  const menu = db.menu.map((item) => {
    const generatedImage = visualMap[item.id];
    if (generatedImage && replaceableImages.has(item.image)) {
      changed = true;
      return { ...item, image: generatedImage };
    }
    return item;
  });

  if (changed) {
    writeDatabase({ ...db, menu });
  }
}

function emitDatabaseUpdate() {
  window.dispatchEvent(
    new CustomEvent("database:update", {
      detail: {
        source: "local",
        at: new Date().toISOString(),
      },
    }),
  );
}

export function initializeDatabase() {
  /*
  ATTUALE IMPLEMENTAZIONE:
  Crea il documento LocalStorage iniziale se non esiste.

  MIGRAZIONE FUTURA MARIADB:
  1) Sostituire con health-check GET /api/health.
  2) Verificare migrazioni schema e versione applicativa.
  3) In caso di sessione scaduta, notificare il livello auth.
  */
  if (DATABASE_MODE === "MARIADB") {
    requestJsonSync("/health");
    emitDatabaseUpdate();
    return;
  }

  if (!localStorage.getItem(DB_KEY)) {
    writeDatabase(clone(defaultDatabase));
  } else {
    migrateDefaultVisualAssets();
  }

  /*
  FUTURO SISTEMA REALTIME:
  Sostituire window.addEventListener("storage") con WebSocket, Server Sent
  Events o MQTT industriale per sincronizzare client, admin e database server
  in tempo reale.
  */
  window.addEventListener("storage", (event) => {
    if (event.key === DB_KEY) {
      window.dispatchEvent(
        new CustomEvent("database:update", {
          detail: {
            source: "storage",
            at: new Date().toISOString(),
          },
        }),
      );
    }
  });
}

export function getMenu() {
  /*
  MIGRAZIONE FUTURA MARIADB:
  Endpoint: GET /api/menu
  Query: SELECT id, name, category, description, price, image, available, created_at, updated_at FROM menu ORDER BY category, name;
  La risposta dovra restare un array di oggetti menu.
  */
  return readDatabase().menu;
}

export function saveMenu(menu) {
  /*
  MIGRAZIONE FUTURA MARIADB:
  Endpoint: PUT /api/menu
  Query: usare transazioni con INSERT ... ON DUPLICATE KEY UPDATE e DELETE per record rimossi.
  Validare prezzi numerici, disponibilita booleana e permessi admin lato server.
  */
  const db = readDatabase();
  writeDatabase({ ...db, menu: clone(menu) });
}

export function getReservations() {
  /*
  ATTUALE IMPLEMENTAZIONE:
  Recupera le prenotazioni da LocalStorage.

  MIGRAZIONE FUTURA MARIADB:
  1) Endpoint: GET /api/reservations
  2) Query:
     SELECT r.*, u.nome, u.cognome, u.email, u.telefono
     FROM reservations r
     LEFT JOIN users u ON u.id = r.user_id
     ORDER BY r.date DESC, r.time DESC;
  3) Il backend dovra mantenere la stessa struttura JSON.
  4) Gestire errori server e timeout nel repository/data layer.
  */
  return readDatabase().reservations;
}

export function saveReservations(reservations) {
  /*
  MIGRAZIONE FUTURA MARIADB:
  Endpoint: PUT /api/reservations
  Query: INSERT/UPDATE reservations con transazione su users e tables.
  Sincronizzazione futura: inviare evento WebSocket "reservations:update".
  */
  const db = readDatabase();
  writeDatabase({ ...db, reservations: clone(reservations) });
}

export function getOrders() {
  /*
  MIGRAZIONE FUTURA MARIADB:
  Endpoint: GET /api/orders
  Query: SELECT id, reservation_id, customer_name, items_json, total, status, created_at FROM orders ORDER BY created_at DESC;
  items_json puo restare JSON o essere normalizzato in order_items.
  */
  return readDatabase().orders;
}

export function saveOrders(orders) {
  /*
  MIGRAZIONE FUTURA MARIADB:
  Endpoint: PUT /api/orders
  Query: transazione su orders e order_items oppure colonna JSON items_json.
  Gestire concorrenza con updated_at o optimistic locking.
  */
  const db = readDatabase();
  writeDatabase({ ...db, orders: clone(orders) });
}

export function getReviews() {
  /*
  MIGRAZIONE FUTURA MARIADB:
  Endpoint: GET /api/reviews
  Query: SELECT id, customer_name, stars, comment, created_at FROM reviews ORDER BY created_at DESC;
  Moderazione futura e permessi admin vanno gestiti lato backend.
  */
  return readDatabase().reviews;
}

export function saveReviews(reviews) {
  /*
  MIGRAZIONE FUTURA MARIADB:
  Endpoint: PUT /api/reviews
  Query: INSERT/DELETE reviews con validazione stelle 1-5 e sanitizzazione commenti.
  */
  const db = readDatabase();
  writeDatabase({ ...db, reviews: clone(reviews) });
}

export function getDashboardStats() {
  /*
  ATTUALE IMPLEMENTAZIONE:
  Calcola statistiche leggendo gli array LocalStorage gia normalizzati.

  MIGRAZIONE FUTURA MARIADB:
  Endpoint: GET /api/dashboard/stats
  Query possibili:
  - SELECT COUNT(*) FROM reservations WHERE date = CURDATE();
  - SELECT COUNT(*) FROM orders WHERE status NOT IN ('Consegnato');
  - SELECT COUNT(*) FROM reviews;
  - SELECT SUM(total) FROM orders WHERE DATE(created_at) = CURDATE();
  Il backend puo restituire numeri aggregati riducendo traffico e carico client.
  */
  const db = readDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const reservationsToday = db.reservations.filter((item) => item.date === today).length;
  const activeOrders = db.orders.filter((item) => item.status !== "Consegnato").length;
  const dailyRevenue = db.orders
    .filter((item) => item.createdAt?.slice(0, 10) === today)
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  return {
    reservationsToday,
    activeOrders,
    reviewCount: db.reviews.length,
    dailyRevenue,
    menuItems: db.menu.length,
    pendingReservations: db.reservations.filter((item) => item.status === "In attesa").length,
  };
}

export function onDatabaseUpdate(callback) {
  window.addEventListener("database:update", callback);
}
