import { initializeDatabase, onDatabaseUpdate, getDashboardStats } from "../../data/storage.js";
import { listMenu } from "../../data/repositories/menuRepository.js";
import { createOrder } from "../../data/repositories/orderRepository.js";
import { createReservation, getTableStates } from "../../data/repositories/reservationRepository.js";
import { createReview, listReviews } from "../../data/repositories/reviewRepository.js";

initializeDatabase();

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const stateLabels = {
  libero: "Libero",
  prenotato: "Prenotato",
  occupato: "Occupato",
};
const stateTone = {
  libero: "var(--green)",
  prenotato: "var(--orange)",
  occupato: "var(--red)",
};

const page = document.body.dataset.page;
const orderDraft = new Map();
let selectedTable = "";
let selectedStars = 5;
let activeMenuCategory = "Tutti";
let menuSearchTerm = "";

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function toast(message) {
  let region = qs(".toast");
  if (!region) {
    region = document.createElement("div");
    region.className = "toast";
    region.setAttribute("aria-live", "polite");
    document.body.append(region);
  }

  const item = document.createElement("div");
  item.className = "toast__item";
  item.textContent = message;
  region.append(item);
  setTimeout(() => item.remove(), 3800);
}

function updateMiniStats() {
  const stats = getDashboardStats();
  qsa("[data-stat]").forEach((element) => {
    const key = element.dataset.stat;
    if (key === "dailyRevenue") {
      element.textContent = euro.format(stats[key] || 0);
      return;
    }
    element.textContent = stats[key] ?? 0;
  });
  qsa("[data-home-stat]").forEach((element) => {
    if (element.dataset.homeStat === "menuCount") {
      element.textContent = listMenu({ onlyAvailable: true }).length;
    }
  });
}

function renderMenuPreview() {
  const mount = qs("#menuPreview");
  if (!mount) return;
  mount.innerHTML = listMenu({ onlyAvailable: true })
    .slice(0, 3)
    .map(
      (item) => `
        <article class="card">
          <img class="card__media" src="${item.image}" alt="Linea produzione del piatto ${item.name}" loading="lazy">
          <div class="card__body">
            <p class="eyebrow">${item.category}</p>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <strong class="dish__price">${euro.format(item.price)}</strong>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderFullMenu() {
  const mount = qs("#menuList");
  if (!mount) return;
  const items = listMenu({ onlyAvailable: true });
  const categories = ["Tutti", ...new Set(items.map((item) => item.category))];
  if (!categories.includes(activeMenuCategory)) activeMenuCategory = "Tutti";

  const filtered = items.filter((item) => {
    const matchesCategory = activeMenuCategory === "Tutti" || item.category === activeMenuCategory;
    const haystack = `${item.name} ${item.category} ${item.description}`.toLowerCase();
    return matchesCategory && haystack.includes(menuSearchTerm.toLowerCase());
  });

  renderMenuFilters(categories);
  const count = qs("#menuCount");
  if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? "piatto" : "piatti"}`;

  if (!filtered.length) {
    mount.innerHTML = `
      <article class="panel menu-empty">
        <p class="eyebrow">Nessun modulo trovato</p>
        <h3>Prova un'altra ricerca</h3>
        <p>Modifica categoria o testo per visualizzare altri piatti disponibili.</p>
      </article>
    `;
    return;
  }

  mount.innerHTML = filtered
    .map(
      (item) => `
        <article class="panel menu-dish">
          <div class="menu-dish__media">
            <img src="${item.image}" alt="Modulo culinario ${item.name}" loading="lazy">
            <span>${item.category}</span>
          </div>
          <div class="menu-dish__body">
            <div>
              <p class="eyebrow">${item.category}</p>
              <h3>${item.name}</h3>
              <p>${item.description}</p>
            </div>
            <div class="menu-dish__footer">
              <strong class="dish__price">${euro.format(item.price)}</strong>
              <a class="button" href="ordinazione.html">Ordina</a>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderMenuFilters(categories) {
  const mount = qs("#menuFilters");
  if (!mount) return;
  mount.innerHTML = categories
    .map(
      (category) => `
        <button class="menu-filter ${category === activeMenuCategory ? "is-active" : ""}" type="button" data-category="${category}" aria-pressed="${category === activeMenuCategory}">
          ${category}
        </button>
      `,
    )
    .join("");
}

function bindMenuCatalog() {
  const search = qs("#menuSearch");
  const filters = qs("#menuFilters");
  if (!search || !filters) return;

  search.addEventListener("input", (event) => {
    menuSearchTerm = event.target.value.trim();
    renderFullMenu();
  });

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeMenuCategory = button.dataset.category;
    renderFullMenu();
  });
}

function renderOrderMenu() {
  const mount = qs("#orderMenu");
  if (!mount) return;
  mount.innerHTML = listMenu({ onlyAvailable: true })
    .map((item) => {
      const quantity = orderDraft.get(item.id)?.quantity || 0;
      return `
        <article class="panel dish" data-id="${item.id}">
          <img class="dish__image" src="${item.image}" alt="Piatto ${item.name} sulla linea logistica" loading="lazy">
          <div>
            <p class="eyebrow">${item.category}</p>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <strong class="dish__price">${euro.format(item.price)}</strong>
          </div>
          <div class="qty" aria-label="Quantita ${item.name}">
            <button type="button" data-action="decrement" aria-label="Rimuovi ${item.name}">-</button>
            <span>${quantity}</span>
            <button type="button" data-action="increment" aria-label="Aggiungi ${item.name}">+</button>
          </div>
        </article>
      `;
    })
    .join("");
  renderOrderTotal();
}

function renderOrderTotal() {
  const total = [...orderDraft.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = [...orderDraft.values()].reduce((sum, item) => sum + item.quantity, 0);
  qs("#orderTotal") && (qs("#orderTotal").textContent = euro.format(total));
  qs("#orderCount") && (qs("#orderCount").textContent = `${count} moduli`);
}

function bindOrder() {
  const mount = qs("#orderMenu");
  const form = qs("#orderForm");
  if (!mount || !form) return;

  mount.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    const row = event.target.closest("[data-id]");
    if (!button || !row) return;

    const item = listMenu({ onlyAvailable: true }).find((entry) => entry.id === row.dataset.id);
    const current = orderDraft.get(item.id) || { ...item, quantity: 0 };
    current.quantity += button.dataset.action === "increment" ? 1 : -1;
    if (current.quantity <= 0) {
      orderDraft.delete(item.id);
    } else {
      orderDraft.set(item.id, current);
    }
    renderOrderMenu();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const items = [...orderDraft.values()];
    if (!items.length) {
      toast("Seleziona almeno un modulo culinario.");
      return;
    }
    const customerName = new FormData(form).get("customerName");
    const order = createOrder({ customerName, items });
    orderDraft.clear();
    form.reset();
    renderOrderMenu();
    toast(`Ordine ${order.id} ricevuto dal sistema logistico.`);
  });
}

function requestedPersons() {
  const value = Number(qs("#persons")?.value || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function renderBookingStats(tables) {
  const mount = qs("#bookingStats");
  if (!mount) return;
  const free = tables.filter((table) => table.state === "libero").length;
  const reserved = tables.filter((table) => table.state === "prenotato").length;
  const busy = tables.filter((table) => table.state === "occupato").length;
  const seats = tables.filter((table) => table.state === "libero").reduce((sum, table) => sum + table.capacity, 0);
  const stats = [
    { label: "Tavoli liberi", value: free, color: "var(--green)" },
    { label: "Prenotati", value: reserved, color: "var(--orange)" },
    { label: "Occupati", value: busy, color: "var(--red)" },
    { label: "Posti liberi", value: seats, color: "var(--blue)" },
  ];
  mount.innerHTML = stats
    .map((stat) => `<div class="booking-stat" style="--stat: ${stat.color}"><span>${stat.label}</span><strong>${stat.value}</strong></div>`)
    .join("");
}

function renderBookingMap() {
  const floor = qs("#mapFloor");
  if (!floor) return;
  const tables = getTableStates();
  const persons = requestedPersons();
  const selected = tables.find((table) => table.code === selectedTable);
  if (selected && (selected.state !== "libero" || (persons && selected.capacity < persons))) {
    selectedTable = "";
  }

  renderBookingStats(tables);
  floor.innerHTML = "";
  tables.forEach((table) => {
    const canFit = !persons || table.capacity >= persons;
    const isAvailable = table.state === "libero" && canFit;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `table-node ${selectedTable === table.code ? "is-selected" : ""}`;
    button.dataset.table = table.code;
    button.dataset.state = table.state;
    button.dataset.fit = String(canFit);
    button.disabled = !isAvailable;
    button.setAttribute("aria-label", `${table.code}, ${table.capacity} posti, stato ${stateLabels[table.state]}`);
    button.innerHTML = `
      <span class="table-node__label">
        <strong>${table.code.replace("TABLE-HUB-", "Tavolo ")}</strong>
        <span>${canFit ? stateLabels[table.state] : "Troppo piccolo"}</span>
        <span class="table-node__capacity">${table.capacity} posti</span>
        <span class="table-node__meta">
          <span class="table-node__pill">${table.priority}</span>
          <span class="table-node__pill">${table.reservations.length} pren.</span>
        </span>
      </span>
    `;
    floor.append(button);
  });
  updateSelectedTablePanel();
}

function updateSelectedTablePanel() {
  const output = qs("#selectedTable");
  const state = qs("#selectedState");
  const capacity = qs("#selectedCapacity");
  const reservations = qs("#selectedReservations");
  const table = getTableStates().find((item) => item.code === selectedTable);

  if (!table) {
    if (output) output.textContent = "NESSUN TAVOLO";
    if (state) {
      state.textContent = "In attesa";
      state.style.color = "var(--orange)";
    }
    if (capacity) capacity.textContent = "-";
    if (reservations) reservations.textContent = "-";
    return;
  }

  if (output) output.textContent = table.code.replace("TABLE-HUB-", "Tavolo ");
  if (state) {
    state.textContent = stateLabels[table.state];
    state.style.color = stateTone[table.state];
  }
  if (capacity) capacity.textContent = `${table.capacity} posti`;
  if (reservations) reservations.textContent = String(table.reservations.length);
}

function setActiveRoute(tableCode) {
  qsa(".network-path").forEach((path) => {
    path.classList.toggle("is-active", path.dataset.route === tableCode || !tableCode);
  });
}

function bindBooking() {
  const floor = qs("#mapFloor");
  const form = qs("#reservationForm");
  const tooltip = qs("#tableTooltip");
  if (!floor || !form) return;

  floor.addEventListener("click", (event) => {
    const node = event.target.closest(".table-node");
    if (!node) return;
    if (node.disabled) {
      toast("Questo tavolo non e disponibile per la richiesta corrente.");
      return;
    }
    selectedTable = node.dataset.table;
    setActiveRoute(selectedTable);
    renderBookingMap();
    toast(`${selectedTable.replace("TABLE-HUB-", "Tavolo ")} agganciato alla richiesta.`);
  });

  floor.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const node = event.target.closest(".table-node");
    if (!node) return;
    event.preventDefault();
    node.click();
  });

  floor.addEventListener("mousemove", (event) => {
    const node = event.target.closest(".table-node");
    if (!node || !tooltip) return;
    const table = getTableStates().find((item) => item.code === node.dataset.table);
    tooltip.innerHTML = `
      <strong>${table.code}</strong><br>
      STATO: ${stateLabels[table.state]}<br>
      CAPIENZA: ${table.capacity} posti<br>
      PRIORITA: ${table.priority}<br>
      PRENOTAZIONI: ${table.reservations.length}
    `;
    tooltip.style.left = `${event.clientX + 16}px`;
    tooltip.style.top = `${event.clientY + 16}px`;
    tooltip.classList.add("is-visible");
  });

  floor.addEventListener("mouseleave", () => tooltip?.classList.remove("is-visible"));

  qs("#persons")?.addEventListener("input", renderBookingMap);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedTable) {
      toast("Seleziona un tavolo libero dalla planimetria.");
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const reservation = createReservation({ ...data, tableCode: selectedTable });
    form.reset();
    selectedTable = "";
    renderBookingMap();
    setActiveRoute("");
    playConfirmation(reservation);
  });
}

function playConfirmation(reservation) {
  const log = qs("#reservationLog");
  if (!log) return;
  const lines = [
    "REQUEST RECEIVED",
    "PROCESSING...",
    "ROUTE GENERATED",
    `TABLE ASSIGNED ${reservation.tableCode}`,
    "CONFIRMATION COMPLETE",
    "FICSIT THANKS YOU FOR YOUR EFFICIENCY",
  ];
  log.innerHTML = "";
  lines.forEach((line, index) => {
    setTimeout(() => {
      const span = document.createElement("span");
      span.textContent = line;
      log.append(span);
    }, index * 420);
  });
  toast(`Prenotazione ${reservation.id} registrata.`);
}

function renderReviews() {
  const mount = qs("#reviewsList");
  if (!mount) return;
  mount.innerHTML = listReviews()
    .map(
      (review) => `
        <article class="panel">
          <p class="eyebrow">${"★".repeat(review.stars)}${"☆".repeat(5 - review.stars)}</p>
          <h3>${review.customerName}</h3>
          <p>${review.comment}</p>
        </article>
      `,
    )
    .join("");
}

function renderStars() {
  const mount = qs("#ratingStars");
  if (!mount) return;
  mount.innerHTML = Array.from({ length: 5 }, (_, index) => {
    const value = index + 1;
    return `<button class="star ${value <= selectedStars ? "is-active" : ""}" type="button" data-stars="${value}" aria-label="${value} stelle"></button>`;
  }).join("");
  const hidden = qs("#starsInput");
  if (hidden) hidden.value = String(selectedStars);
}

function bindReviews() {
  const form = qs("#reviewForm");
  const stars = qs("#ratingStars");
  if (!form || !stars) return;
  stars.addEventListener("click", (event) => {
    const button = event.target.closest("[data-stars]");
    if (!button) return;
    selectedStars = Number(button.dataset.stars);
    renderStars();
    renderReviewPreview();
  });
  form.addEventListener("input", renderReviewPreview);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    createReview(Object.fromEntries(new FormData(form)));
    form.reset();
    selectedStars = 5;
    renderStars();
    renderReviews();
    renderReviewPreview();
    toast("Recensione inviata al centro analisi feedback.");
  });
}

function renderReviewPreview() {
  const preview = qs("#reviewPreview");
  const form = qs("#reviewForm");
  if (!preview || !form) return;
  const data = Object.fromEntries(new FormData(form));
  preview.innerHTML = `
    <p class="eyebrow">${"★".repeat(selectedStars)}${"☆".repeat(5 - selectedStars)}</p>
    <h3>${data.customerName || "OPERATORE"}</h3>
    <p>${data.comment || "Preview del feedback in attesa di trasmissione."}</p>
  `;
}

function bootPage() {
  updateMiniStats();
  renderMenuPreview();
  renderFullMenu();
  bindMenuCatalog();
  renderOrderMenu();
  bindOrder();
  renderBookingMap();
  bindBooking();
  renderStars();
  bindReviews();
  renderReviews();
  renderReviewPreview();
}

bootPage();

window.addEventListener("resize", () => {
  if (qs("#mapFloor")) {
    renderBookingMap();
  }
});

onDatabaseUpdate(() => {
  updateMiniStats();
  renderMenuPreview();
  renderFullMenu();
  renderOrderMenu();
  renderBookingMap();
  renderReviews();
  if (page === "booking") toast("Database sincronizzato: mappa aggiornata.");
});
