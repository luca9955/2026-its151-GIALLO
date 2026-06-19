import {
  createId,
  getDashboardStats,
  getMenu,
  getOrders,
  getReservations,
  getReviews,
  onDatabaseChange,
  saveMenu,
  saveOrders,
  saveReservations,
  saveReviews
} from "../data/storage.js";

const frame = document.getElementById("adminFrame");
let currentView = "dashboard";
let filters = { reservations: "", orders: "", reviews: "", menu: "" };

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const money = (value) => euro.format(Number(value || 0));
const escapeText = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function shell(content) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="principale.css"></head><body class="frame-body">${content}</body></html>`;
}

function progressRing(label, value, max) {
  const percent = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  const dash = 2 * Math.PI * 34;
  const offset = dash - (dash * percent) / 100;
  return `<svg class="ring" viewBox="0 0 90 90" role="img" aria-label="${label} ${percent}%">
    <circle cx="45" cy="45" r="34" fill="none" stroke="#333" stroke-width="10"/>
    <circle cx="45" cy="45" r="34" fill="none" stroke="#ff6a00" stroke-width="10" stroke-dasharray="${dash}" stroke-dashoffset="${offset}" transform="rotate(-90 45 45)"/>
    <text x="45" y="50" text-anchor="middle" fill="#fff" font-size="18">${percent}%</text>
  </svg>`;
}

function dashboardView() {
  const stats = getDashboardStats();
  return shell(`
    <section class="frame-grid">
      <article class="frame-panel stat"><span class="accent">Prenotazioni oggi</span><strong>${stats.todayReservations}</strong>${progressRing("Prenotazioni oggi", stats.todayReservations, 16)}</article>
      <article class="frame-panel stat"><span class="accent">Ordini attivi</span><strong>${stats.activeOrders}</strong>${progressRing("Ordini attivi", stats.activeOrders, 12)}</article>
      <article class="frame-panel stat"><span class="accent">Recensioni</span><strong>${stats.reviewCount}</strong>${progressRing("Recensioni", stats.reviewCount, 20)}</article>
      <article class="frame-panel stat"><span class="accent">Incasso giornaliero</span><strong>${money(stats.dailyRevenue)}</strong>
        <svg viewBox="0 0 280 90" role="img" aria-label="Grafico incasso giornaliero">
          <polyline points="10,75 70,55 130,62 190,30 260,20" fill="none" stroke="#ff6a00" stroke-width="6"/>
          <g fill="#ccc"><circle cx="10" cy="75" r="5"/><circle cx="70" cy="55" r="5"/><circle cx="130" cy="62" r="5"/><circle cx="190" cy="30" r="5"/><circle cx="260" cy="20" r="5"/></g>
        </svg>
      </article>
    </section>
  `);
}

function menuView() {
  const query = filters.menu.toLowerCase();
  const rows = getMenu().filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(query));
  return shell(`
    <section class="frame-panel">
      <h2>Gestione Menu</h2>
      <div class="toolbar"><input id="menuSearch" value="${escapeText(filters.menu)}" placeholder="Cerca piatto"></div>
      <form id="menuForm" class="form-row">
        <input name="name" placeholder="Nome piatto" required>
        <input name="category" placeholder="Categoria" required>
        <input name="description" placeholder="Descrizione" required>
        <input name="price" type="number" step="0.01" min="0" placeholder="Prezzo" required>
        <input name="image" placeholder="assets/images/dish-iron-steak.svg" required>
        <select name="available"><option value="true">Disponibile</option><option value="false">Non disponibile</option></select>
        <button class="frame-btn" type="submit">Aggiungi</button>
      </form>
      <table><thead><tr><th>Piatto</th><th>Categoria</th><th>Prezzo</th><th>Disponibilita</th><th>Azioni</th></tr></thead><tbody>
        ${rows.map((item) => `<tr data-id="${item.id}">
          <td><strong>${escapeText(item.name)}</strong><br>${escapeText(item.description)}</td>
          <td>${escapeText(item.category)}</td>
          <td><input data-field="price" type="number" step="0.01" value="${item.price}"></td>
          <td><select data-field="available"><option value="true" ${item.available ? "selected" : ""}>Disponibile</option><option value="false" ${!item.available ? "selected" : ""}>Non disponibile</option></select></td>
          <td class="actions"><button class="frame-btn" data-action="save-menu">Salva</button><button class="frame-btn" data-action="delete-menu">Elimina</button></td>
        </tr>`).join("")}
      </tbody></table>
    </section>
  `);
}

function reservationsView() {
  const query = filters.reservations.toLowerCase();
  const rows = getReservations().filter((item) => `${item.firstName} ${item.lastName} ${item.status} T${item.tableId}`.toLowerCase().includes(query));
  return shell(`
    <section class="frame-panel">
      <h2>Prenotazioni</h2>
      <div class="toolbar"><input id="reservationSearch" value="${escapeText(filters.reservations)}" placeholder="Cerca o filtra"></div>
      <table><thead><tr><th>ID</th><th>Cliente</th><th>Tavolo</th><th>Data</th><th>Ora</th><th>Stato</th></tr></thead><tbody>
        ${rows.map((item) => `<tr data-id="${item.id}">
          <td>${item.id}</td><td>${escapeText(item.firstName)} ${escapeText(item.lastName)}<br>${escapeText(item.email)}</td><td>T${item.tableId}</td><td>${item.date}</td><td>${item.time}</td>
          <td><select data-action="reservation-status"><option ${item.status === "In attesa" ? "selected" : ""}>In attesa</option><option ${item.status === "Approvata" ? "selected" : ""}>Approvata</option><option ${item.status === "Rifiutata" ? "selected" : ""}>Rifiutata</option></select></td>
        </tr>`).join("")}
      </tbody></table>
    </section>
  `);
}

function ordersView() {
  const query = filters.orders.toLowerCase();
  const rows = getOrders().filter((item) => `${item.customer} ${item.status} ${item.tableCode}`.toLowerCase().includes(query));
  return shell(`
    <section class="frame-panel">
      <h2>Ordinazioni</h2>
      <div class="toolbar"><input id="orderSearch" value="${escapeText(filters.orders)}" placeholder="Cerca ordine"></div>
      <table><thead><tr><th>ID</th><th>Cliente</th><th>Articoli</th><th>Totale</th><th>Stato</th></tr></thead><tbody>
        ${rows.map((item) => `<tr data-id="${item.id}">
          <td>${item.id}<br>${escapeText(item.tableCode)}</td><td>${escapeText(item.customer)}</td>
          <td>${item.items.map((line) => `${line.quantity} x ${escapeText(line.name)}`).join("<br>")}</td><td>${money(item.total)}</td>
          <td><select data-action="order-status"><option ${item.status === "Ricevuto" ? "selected" : ""}>Ricevuto</option><option ${item.status === "Accettato" ? "selected" : ""}>Accettato</option><option ${item.status === "In preparazione" ? "selected" : ""}>In preparazione</option><option ${item.status === "Pronto" ? "selected" : ""}>Pronto</option><option ${item.status === "Consegnato" ? "selected" : ""}>Consegnato</option></select></td>
        </tr>`).join("")}
      </tbody></table>
    </section>
  `);
}

function reviewsView() {
  const query = filters.reviews.toLowerCase();
  const rows = getReviews().filter((item) => `${item.name} ${item.comment} ${item.rating}`.toLowerCase().includes(query));
  return shell(`
    <section class="frame-panel">
      <h2>Recensioni</h2>
      <div class="toolbar"><input id="reviewSearch" value="${escapeText(filters.reviews)}" placeholder="Cerca o filtra"></div>
      <table><thead><tr><th>Nome</th><th>Stelle</th><th>Commento</th><th>Azioni</th></tr></thead><tbody>
        ${rows.map((item) => `<tr data-id="${item.id}"><td>${escapeText(item.name)}</td><td>${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}</td><td>${escapeText(item.comment)}</td><td><button class="frame-btn" data-action="delete-review">Elimina</button></td></tr>`).join("")}
      </tbody></table>
    </section>
  `);
}

function render() {
  const views = { dashboard: dashboardView, menu: menuView, reservations: reservationsView, orders: ordersView, reviews: reviewsView };
  frame.srcdoc = views[currentView]();
  frame.addEventListener("load", bindFrame, { once: true });
}

function bindFrame() {
  const doc = frame.contentDocument;
  doc.addEventListener("input", (event) => {
    if (event.target.id === "menuSearch") filters.menu = event.target.value;
    if (event.target.id === "reservationSearch") filters.reservations = event.target.value;
    if (event.target.id === "orderSearch") filters.orders = event.target.value;
    if (event.target.id === "reviewSearch") filters.reviews = event.target.value;
    if (event.target.matches("#menuSearch,#reservationSearch,#orderSearch,#reviewSearch")) render();
  });

  doc.addEventListener("submit", (event) => {
    if (event.target.id !== "menuForm") return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    saveMenu([...getMenu(), {
      id: createId("menu"),
      name: data.name,
      category: data.category,
      description: data.description,
      price: Number(data.price),
      image: data.image,
      available: data.available === "true"
    }]);
    render();
  });

  doc.addEventListener("change", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    if (event.target.dataset.action === "reservation-status") {
      saveReservations(getReservations().map((item) => item.id === row.dataset.id ? { ...item, status: event.target.value } : item));
    }
    if (event.target.dataset.action === "order-status") {
      saveOrders(getOrders().map((item) => item.id === row.dataset.id ? { ...item, status: event.target.value } : item));
    }
  });

  doc.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const row = button.closest("tr[data-id]");
    if (button.dataset.action === "delete-review") saveReviews(getReviews().filter((item) => item.id !== row.dataset.id));
    if (button.dataset.action === "delete-menu") saveMenu(getMenu().filter((item) => item.id !== row.dataset.id));
    if (button.dataset.action === "save-menu") {
      const price = Number(row.querySelector('[data-field="price"]').value);
      const available = row.querySelector('[data-field="available"]').value === "true";
      saveMenu(getMenu().map((item) => item.id === row.dataset.id ? { ...item, price, available } : item));
    }
    render();
  });
}

document.querySelector(".admin-shell__side").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");
  if (!button) return;
  currentView = button.dataset.view;
  document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("is-active", item === button));
  render();
});

onDatabaseChange(render);
render();
