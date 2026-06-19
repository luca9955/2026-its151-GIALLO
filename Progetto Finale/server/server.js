import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withConnection, withTransaction } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "20mb" }));

const defaultTables = Array.from({ length: 16 }, (_, index) => {
  const id = index + 1;
  const capacities = [2, 4, 4, 6, 2, 8, 4, 6, 4, 2, 8, 4, 6, 4, 2, 6];
  return {
    code: `TABLE-HUB-${String(id).padStart(2, "0")}`,
    capacity: capacities[index],
    x: (index % 4) + 1,
    y: Math.floor(index / 4) + 1,
  };
});

const defaultMenu = [
  ["MENU-001", "Assembler Burger", "Moduli Caldi", "Doppio smash burger, cheddar fuso, cipolla caramellata e salsa arancio industriale.", 15.5, "assets/images/menu/assembler-burger.png", true],
  ["MENU-002", "Conveyor Ribs", "Linea Proteica", "Costine glassate a bassa temperatura con riduzione affumicata e chips di patate.", 21, "assets/images/menu/conveyor-ribs.png", true],
  ["MENU-003", "Power Slug Salad", "Biomassa Premium", "Insalata croccante con avocado, semi tostati, lime e dressing verde luminoso.", 12, "assets/images/menu/power-slug-salad.png", true],
  ["MENU-004", "Foundry Carbonara", "Pasta Fusa", "Carbonara cremosa con guanciale croccante e pepe tostato su piatto in acciaio.", 14, "assets/images/menu/foundry-carbonara.png", true],
  ["MENU-005", "Space Elevator Sundae", "Dessert Logistici", "Gelato vaniglia, crumble cacao, caramello salato e granella arancio.", 8, "assets/images/menu/space-elevator-sundae.png", true],
];

function dateOnly(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function iso(value) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function mapReservation(row) {
  return {
    id: row.id,
    firstName: row.nome || "",
    lastName: row.cognome || "",
    phone: row.telefono || "",
    email: row.email || "",
    persons: Number(row.persons),
    date: dateOnly(row.date),
    time: timeOnly(row.time),
    tableCode: row.table_code,
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapMenuItem(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description,
    price: Number(item.price),
    image: item.image,
    available: Boolean(item.available),
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    customerName: row.customer_name,
    items: typeof row.items_json === "string" ? JSON.parse(row.items_json) : row.items_json,
    total: Number(row.total),
    status: row.status,
    createdAt: iso(row.created_at),
  };
}

function mapReview(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    stars: Number(row.stars),
    comment: row.comment,
    createdAt: iso(row.created_at),
  };
}

async function seedDatabase(connection) {
  for (const table of defaultTables) {
    await connection.query(
      "INSERT INTO tables (code, capacity, position_x, position_y, position_z) VALUES (?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), position_x = VALUES(position_x), position_y = VALUES(position_y)",
      [table.code, table.capacity, table.x, table.y],
    );
  }

  const [{ count }] = await connection.query("SELECT COUNT(*) AS count FROM menu");
  if (Number(count) === 0) {
    for (const item of defaultMenu) {
      await connection.query(
        "INSERT INTO menu (id, name, category, description, price, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)",
        item,
      );
    }
  }
}

async function readDatabase(connection) {
  await seedDatabase(connection);
  const [menu, reservations, orders, reviews] = await Promise.all([
    connection.query("SELECT id, name, category, description, price, image, available FROM menu ORDER BY category, name"),
    connection.query("SELECT r.*, u.nome, u.cognome, u.email, u.telefono FROM reservations r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.date DESC, r.time DESC"),
    connection.query("SELECT id, reservation_id, customer_name, items_json, total, status, created_at FROM orders ORDER BY created_at DESC"),
    connection.query("SELECT id, customer_name, stars, comment, created_at FROM reviews ORDER BY created_at DESC"),
  ]);

  return {
    version: 1,
    menu: menu.map(mapMenuItem),
    reservations: reservations.map(mapReservation),
    orders: orders.map(mapOrder),
    reviews: reviews.map(mapReview),
  };
}

async function replaceMenu(connection, menu) {
  await connection.query("DELETE FROM menu");
  for (const item of menu) {
    await connection.query(
      "INSERT INTO menu (id, name, category, description, price, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [item.id, item.name, item.category, item.description, Number(item.price), item.image, Boolean(item.available)],
    );
  }
}

async function upsertUser(connection, reservation) {
  const firstName = reservation.firstName || "";
  const lastName = reservation.lastName || "";
  const email = reservation.email || `${reservation.id.toLowerCase()}@local.ficsit`;
  const phone = reservation.phone || "";
  await connection.query(
    "INSERT INTO users (nome, cognome, email, telefono) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nome = VALUES(nome), cognome = VALUES(cognome), telefono = VALUES(telefono)",
    [firstName, lastName, email, phone],
  );
  const rows = await connection.query("SELECT id FROM users WHERE email = ?", [email]);
  return rows[0].id;
}

async function replaceReservations(connection, reservations) {
  await connection.query("DELETE FROM orders");
  await connection.query("DELETE FROM reservations");
  for (const reservation of reservations) {
    const userId = await upsertUser(connection, reservation);
    await connection.query(
      "INSERT INTO reservations (id, user_id, table_code, persons, date, time, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        reservation.id,
        userId,
        reservation.tableCode,
        Number(reservation.persons),
        reservation.date,
        reservation.time,
        reservation.status || "In attesa",
        new Date(reservation.createdAt || Date.now()),
        new Date(reservation.updatedAt || Date.now()),
      ],
    );
  }
}

async function replaceOrders(connection, orders) {
  await connection.query("DELETE FROM orders");
  for (const order of orders) {
    await connection.query(
      "INSERT INTO orders (id, reservation_id, customer_name, items_json, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        order.id,
        order.reservationId || null,
        order.customerName,
        JSON.stringify(order.items || []),
        Number(order.total),
        order.status || "Ricevuto",
        new Date(order.createdAt || Date.now()),
      ],
    );
  }
}

async function replaceReviews(connection, reviews) {
  await connection.query("DELETE FROM reviews");
  for (const review of reviews) {
    await connection.query(
      "INSERT INTO reviews (id, customer_name, stars, comment, created_at) VALUES (?, ?, ?, ?, ?)",
      [review.id, review.customerName, Number(review.stars), review.comment, new Date(review.createdAt || Date.now())],
    );
  }
}

app.get("/api/health", async (_request, response, next) => {
  try {
    await withConnection(async (connection) => {
      await connection.query("SELECT 1");
      await seedDatabase(connection);
    });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/database", async (_request, response, next) => {
  try {
    response.json(await withConnection(readDatabase));
  } catch (error) {
    next(error);
  }
});

app.put("/api/database", async (request, response, next) => {
  try {
    const database = await withTransaction(async (connection) => {
      await seedDatabase(connection);
      await replaceMenu(connection, request.body.menu || []);
      await replaceReservations(connection, request.body.reservations || []);
      await replaceOrders(connection, request.body.orders || []);
      await replaceReviews(connection, request.body.reviews || []);
      return readDatabase(connection);
    });
    response.json(database);
  } catch (error) {
    next(error);
  }
});

app.get("/api/menu", async (_request, response, next) => {
  try {
    response.json((await withConnection(readDatabase)).menu);
  } catch (error) {
    next(error);
  }
});

app.put("/api/menu", async (request, response, next) => {
  try {
    await withTransaction((connection) => replaceMenu(connection, request.body || []));
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reservations", async (_request, response, next) => {
  try {
    response.json((await withConnection(readDatabase)).reservations);
  } catch (error) {
    next(error);
  }
});

app.put("/api/reservations", async (request, response, next) => {
  try {
    await withTransaction((connection) => replaceReservations(connection, request.body || []));
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders", async (_request, response, next) => {
  try {
    response.json((await withConnection(readDatabase)).orders);
  } catch (error) {
    next(error);
  }
});

app.put("/api/orders", async (request, response, next) => {
  try {
    await withTransaction((connection) => replaceOrders(connection, request.body || []));
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reviews", async (_request, response, next) => {
  try {
    response.json((await withConnection(readDatabase)).reviews);
  } catch (error) {
    next(error);
  }
});

app.put("/api/reviews", async (request, response, next) => {
  try {
    await withTransaction((connection) => replaceReviews(connection, request.body || []));
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/stats", async (_request, response, next) => {
  try {
    const db = await withConnection(readDatabase);
    const today = new Date().toISOString().slice(0, 10);
    response.json({
      reservationsToday: db.reservations.filter((item) => item.date === today).length,
      activeOrders: db.orders.filter((item) => item.status !== "Consegnato").length,
      reviewCount: db.reviews.length,
      dailyRevenue: db.orders.filter((item) => item.createdAt.slice(0, 10) === today).reduce((sum, item) => sum + Number(item.total || 0), 0),
      menuItems: db.menu.length,
      pendingReservations: db.reservations.filter((item) => item.status === "In attesa").length,
    });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(projectRoot));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: error.message || "Errore server" });
});

app.listen(port, () => {
  console.log(`FICSIT Restaurant OS su http://localhost:${port}`);
});
