const DB_KEYS = {
  menu: "ficsit.menu",
  reservations: "ficsit.reservations",
  orders: "ficsit.orders",
  reviews: "ficsit.reviews",
  tables: "ficsit.tables"
};

const today = () => new Date().toISOString().slice(0, 10);

const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("ficsit:storage", { detail: { key, value } }));
};

const seedMenu = [
  {
    id: "m-iron-steak",
    name: "Iron Plate Steak",
    category: "Forge Grill",
    description: "Tagliata affumicata con salsa pepe arancione FICSIT.",
    price: 18.5,
    image: "assets/images/dish-iron-steak.svg",
    available: true
  },
  {
    id: "m-conveyor-burger",
    name: "Conveyor Burger Mk.2",
    category: "Assembly Line",
    description: "Burger industriale con cheddar, cipolla croccante e chip di bauxite.",
    price: 15.9,
    image: "assets/images/dish-conveyor-burger.svg",
    available: true
  },
  {
    id: "m-nuclear-noodles",
    name: "Nuclear Noodles",
    category: "Power Plant",
    description: "Noodles verdi al lime, spezie e vapore controllato.",
    price: 13.2,
    image: "assets/images/dish-nuclear-noodles.svg",
    available: true
  },
  {
    id: "m-alien-dessert",
    name: "Alien Biomass Cake",
    category: "Research Lab",
    description: "Dessert al pistacchio, cioccolato nero e glassa fluorescente.",
    price: 8.7,
    image: "assets/images/dish-biomass-cake.svg",
    available: true
  }
];

const seedTables = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
  status: index === 2 || index === 10 ? "occupato" : "libero",
  reservationId: null
}));

export function initializeDatabase() {
  if (!localStorage.getItem(DB_KEYS.menu)) saveMenu(seedMenu);
  if (!localStorage.getItem(DB_KEYS.reservations)) saveReservations([]);
  if (!localStorage.getItem(DB_KEYS.orders)) saveOrders([]);
  if (!localStorage.getItem(DB_KEYS.reviews)) saveReviews([]);
  if (!localStorage.getItem(DB_KEYS.tables)) write(DB_KEYS.tables, seedTables);
}

export function getMenu() {
  return read(DB_KEYS.menu, seedMenu);
}

export function saveMenu(menu) {
  write(DB_KEYS.menu, menu);
}

export function getReservations() {
  return read(DB_KEYS.reservations, []);
}

export function saveReservations(reservations) {
  write(DB_KEYS.reservations, reservations);
  const activeIds = new Set(
    reservations.filter((item) => item.status !== "Rifiutata").map((item) => item.tableId)
  );
  const tables = getTables().map((table) => {
    if (table.status === "occupato") return table;
    return activeIds.has(table.id)
      ? { ...table, status: "prenotato" }
      : { ...table, status: "libero", reservationId: null };
  });
  write(DB_KEYS.tables, tables);
}

export function getOrders() {
  return read(DB_KEYS.orders, []);
}

export function saveOrders(orders) {
  write(DB_KEYS.orders, orders);
}

export function getReviews() {
  return read(DB_KEYS.reviews, []);
}

export function saveReviews(reviews) {
  write(DB_KEYS.reviews, reviews);
}

export function getTables() {
  return read(DB_KEYS.tables, seedTables);
}

export function saveTables(tables) {
  write(DB_KEYS.tables, tables);
}

export function getDashboardStats() {
  const reservations = getReservations();
  const orders = getOrders();
  const reviews = getReviews();
  const todayDate = today();
  const activeOrderStates = ["Ricevuto", "Accettato", "In preparazione", "Pronto"];

  return {
    todayReservations: reservations.filter((item) => item.date === todayDate).length,
    activeOrders: orders.filter((item) => activeOrderStates.includes(item.status)).length,
    reviewCount: reviews.length,
    dailyRevenue: orders
      .filter((item) => item.date === todayDate && item.status !== "Annullato")
      .reduce((sum, item) => sum + Number(item.total || 0), 0)
  };
}

export function createId(prefix = "fx") {
  return uid(prefix);
}

export function onDatabaseChange(callback) {
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener("ficsit:storage", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("ficsit:storage", handler);
  };
}

initializeDatabase();
