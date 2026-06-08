import {
  createId,
  getMenu,
  getOrders,
  getReservations,
  getReviews,
  getTables,
  onDatabaseChange,
  saveOrders,
  saveReservations,
  saveReviews
} from "../../data/storage.js";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const page = document.body.dataset.page;
let selectedTable = null;
let cart = {};
let rating = 0;

const byId = (id) => document.getElementById(id);
const money = (value) => euro.format(Number(value || 0));

function renderMenuCards(targetId = "menuGrid", withOrderControls = false) {
  const target = byId(targetId);
  if (!target) return;
  const menu = getMenu().filter((item) => item.available);
  target.innerHTML = menu
    .map((item) => `
      <article class="card menu-item">
        <img class="card__media" src="${item.image}" alt="Immagine industriale del piatto ${item.name}" loading="lazy">
        <div class="card__body">
          <span class="eyebrow">${item.category}</span>
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <strong>${money(item.price)}</strong>
          ${withOrderControls ? `
            <div class="order-controls" data-id="${item.id}">
              <div class="qty" aria-label="Quantita ${item.name}">
                <button type="button" data-action="minus">-</button>
                <span data-qty>${cart[item.id] || 0}</span>
                <button type="button" data-action="plus">+</button>
              </div>
            </div>` : ""}
        </div>
      </article>
    `)
    .join("");
}

function renderTables() {
  const target = byId("tableMap");
  if (!target) return;
  target.innerHTML = getTables()
    .map((table) => `
      <button class="table-seat ${selectedTable === table.id ? "is-selected" : ""}"
        type="button"
        data-table="${table.id}"
        data-status="${table.status}"
        ${table.status !== "libero" ? "disabled" : ""}
        title="Tavolo ${table.id}: ${table.status}"
        aria-label="Tavolo ${table.id}, stato ${table.status}">
        T${table.id}
      </button>
    `)
    .join("");
}

function initReservation() {
  renderTables();
  byId("tableMap")?.addEventListener("click", (event) => {
    const seat = event.target.closest("[data-table]");
    if (!seat || seat.disabled) return;
    selectedTable = Number(seat.dataset.table);
    byId("selectedTable").value = `T${selectedTable}`;
    renderTables();
  });

  byId("reservationForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedTable) {
      byId("reservationNotice").textContent = "Seleziona un tavolo libero dalla planimetria.";
      return;
    }
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const reservations = getReservations();
    const reservation = {
      id: createId("res"),
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      people: Number(data.people),
      date: data.date,
      time: data.time,
      tableId: selectedTable,
      status: "In attesa",
      createdAt: new Date().toISOString()
    };
    saveReservations([...reservations, reservation]);
    event.currentTarget.reset();
    byId("selectedTable").value = "";
    byId("reservationNotice").textContent = `Prenotazione ${reservation.id} inviata al terminale admin.`;
    selectedTable = null;
    renderTables();
  });

  onDatabaseChange(renderTables);
}

function renderOrderTotal() {
  const menu = getMenu();
  const lines = menu.filter((item) => cart[item.id] > 0);
  const total = lines.reduce((sum, item) => sum + item.price * cart[item.id], 0);
  byId("orderTotal").textContent = money(total);
  byId("orderSummary").innerHTML = lines.length
    ? lines.map((item) => `<p>${cart[item.id]} x ${item.name} - ${money(item.price * cart[item.id])}</p>`).join("")
    : "<p>Nessun modulo alimentare selezionato.</p>";
}

function initOrder() {
  renderMenuCards("orderGrid", true);
  renderOrderTotal();
  byId("orderGrid")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = button.closest("[data-id]").dataset.id;
    const delta = button.dataset.action === "plus" ? 1 : -1;
    cart[id] = Math.max(0, (cart[id] || 0) + delta);
    renderMenuCards("orderGrid", true);
    renderOrderTotal();
  });

  byId("orderForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const menu = getMenu();
    const items = menu
      .filter((item) => cart[item.id] > 0)
      .map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: cart[item.id] }));
    if (!items.length) {
      byId("orderNotice").textContent = "Aggiungi almeno un piatto all'ordine.";
      return;
    }
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const order = {
      id: createId("ord"),
      customer: data.customer,
      tableCode: data.tableCode,
      items,
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      status: "Ricevuto",
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString()
    };
    saveOrders([...getOrders(), order]);
    cart = {};
    event.currentTarget.reset();
    renderMenuCards("orderGrid", true);
    renderOrderTotal();
    byId("orderNotice").textContent = `Ordine ${order.id} trasmesso alla cucina FICSIT.`;
  });
}

function initReviews() {
  const stars = byId("stars");
  const preview = byId("reviewPreview");
  const renderStars = () => {
    stars.querySelectorAll(".star").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.value) <= rating);
    });
  };
  stars?.addEventListener("click", (event) => {
    const button = event.target.closest(".star");
    if (!button) return;
    rating = Number(button.dataset.value);
    byId("ratingValue").value = rating;
    renderStars();
  });
  byId("reviewForm")?.addEventListener("input", (event) => {
    const data = Object.fromEntries(new FormData(event.currentTarget));
    preview.innerHTML = `<strong>${data.name || "Pioniere anonimo"}</strong><p>${"★".repeat(rating)}${"☆".repeat(5 - rating)}</p><p>${data.comment || "Anteprima commento..."}</p>`;
  });
  byId("reviewForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!rating) {
      byId("reviewNotice").textContent = "Seleziona almeno una stella.";
      return;
    }
    const data = Object.fromEntries(new FormData(event.currentTarget));
    saveReviews([...getReviews(), {
      id: createId("rev"),
      name: data.name,
      rating,
      comment: data.comment,
      createdAt: new Date().toISOString()
    }]);
    event.currentTarget.reset();
    rating = 0;
    renderStars();
    preview.innerHTML = "";
    byId("reviewNotice").textContent = "Recensione sincronizzata con il pannello admin.";
  });
}

if (page === "menu") renderMenuCards();
if (page === "prenotazione") initReservation();
if (page === "ordinazione") initOrder();
if (page === "recensioni") initReviews();

onDatabaseChange(() => {
  if (page === "menu") renderMenuCards();
  if (page === "ordinazione") {
    renderMenuCards("orderGrid", true);
    renderOrderTotal();
  }
});
