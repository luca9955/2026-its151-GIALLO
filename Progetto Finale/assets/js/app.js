import { initializeDatabase, onDatabaseUpdate, getDashboardStats } from "../../data/storage.js";
import { listMenu } from "../../data/repositories/menuRepository.js";
import { createOrder } from "../../data/repositories/orderRepository.js";
import { clearTableSession, createReservation, getTableSession, getTableStates } from "../../data/repositories/reservationRepository.js";
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
const bookingOpeningWindows = [
  { start: "18:00", end: "01:00" },
];
const bookingDurationMinutes = 120;
const bookingMaxDaysAhead = 90;

const page = document.body.dataset.page;
const orderDraft = new Map();
let selectedTable = "";
let activeTableSession = null;
let bookingTableStates = [];
let selectedStars = 5;
let activeMenuCategory = "Tutti";
let menuSearchTerm = "";
let easterBound = false;
let easterKeyTrail = [];
let menuSecretFound = false;

const konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function ratingHtml(stars) {
  const safeStars = Math.max(0, Math.min(5, Number(stars) || 0));
  return `${"&#9733;".repeat(safeStars)}${"&#9734;".repeat(5 - safeStars)}`;
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

function ensureEasterLayer() {
  let layer = qs(".easter-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "easter-layer";
    layer.setAttribute("aria-live", "polite");
    document.body.append(layer);
  }
  return layer;
}

function showEasterMessage(title, detail) {
  const layer = ensureEasterLayer();
  const message = document.createElement("div");
  message.className = "easter-message";
  message.innerHTML = `<strong>${esc(title)}</strong><span>${esc(detail)}</span>`;
  layer.append(message);
  setTimeout(() => message.remove(), 4200);
}

function rainEasterTokens(label, count = 18) {
  const layer = ensureEasterLayer();
  for (let index = 0; index < count; index += 1) {
    const token = document.createElement("span");
    token.className = "easter-token";
    token.textContent = label;
    token.style.setProperty("--x", `${Math.random() * 100}%`);
    token.style.setProperty("--delay", `${Math.random() * 0.8}s`);
    token.style.setProperty("--duration", `${2.4 + Math.random() * 1.4}s`);
    token.style.setProperty("--drift", `${Math.random() * 86 - 43}px`);
    layer.append(token);
    setTimeout(() => token.remove(), 4800);
  }
}

function activateEasterProtocol(title, detail, token = "FICSIT", duration = 5200) {
  document.body.classList.add("is-easter-active");
  showEasterMessage(title, detail);
  rainEasterTokens(token);
  setTimeout(() => document.body.classList.remove("is-easter-active"), duration);
}

function activateVisibleTicket() {
  activateEasterProtocol("Ticket FICSIT emesso", "Bonus efficienza: pausa approvata per 0.4 secondi.", "TICKET");
}

function activateHiddenProtocol() {
  activateEasterProtocol("Protocollo segreto attivo", "La produzione culinaria entra in modalita massima efficienza.", "250%");
}

function activateBudinoProtocol() {
  activateEasterProtocol("Budino Ficsit classificato", "Dessert logistico autorizzato dal controllo qualita.", "BUDINO");
}

function isTypingField(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']")) || Boolean(target?.isContentEditable);
}

function maybeActivateMenuSearchEgg(term) {
  if (menuSecretFound) return;
  if (term.toLowerCase().includes("budino")) {
    menuSecretFound = true;
    activateBudinoProtocol();
  }
}

function bindEasterEggs() {
  if (easterBound) return;
  easterBound = true;

  const visibleButton = document.createElement("button");
  visibleButton.className = "visible-easter";
  visibleButton.type = "button";
  visibleButton.textContent = "FICSIT TICKET";
  visibleButton.setAttribute("aria-label", "Easter egg visibile FICSIT Ticket");
  visibleButton.addEventListener("click", activateVisibleTicket);
  document.body.append(visibleButton);

  document.addEventListener("keydown", (event) => {
    if (isTypingField(event.target)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    easterKeyTrail = [...easterKeyTrail, key].slice(-konamiCode.length);
    if (easterKeyTrail.join("|") === konamiCode.join("|")) {
      easterKeyTrail = [];
      activateHiddenProtocol();
    }
  });

  document.addEventListener("dblclick", (event) => {
    const image = event.target.closest(".card__media, .dish__image, .menu-dish__media img");
    if (image?.getAttribute("alt")?.toLowerCase().includes("budino")) {
      activateBudinoProtocol();
    }
  });
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
          <img class="card__media" src="${esc(item.image)}" alt="Linea produzione del piatto ${esc(item.name)}" loading="lazy">
          <div class="card__body">
            <p class="eyebrow">${esc(item.category)}</p>
            <h3>${esc(item.name)}</h3>
            <p>${esc(item.description)}</p>
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
            <img src="${esc(item.image)}" alt="Modulo culinario ${esc(item.name)}" loading="lazy">
            <span>${esc(item.category)}</span>
          </div>
          <div class="menu-dish__body">
            <div>
              <p class="eyebrow">${esc(item.category)}</p>
              <h3>${esc(item.name)}</h3>
              <p>${esc(item.description)}</p>
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
        <button class="menu-filter ${category === activeMenuCategory ? "is-active" : ""}" type="button" data-category="${esc(category)}" aria-pressed="${category === activeMenuCategory}">
          ${esc(category)}
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
    maybeActivateMenuSearchEgg(menuSearchTerm);
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
          <img class="dish__image" src="${esc(item.image)}" alt="Piatto ${esc(item.name)} sulla linea logistica" loading="lazy">
          <div>
            <p class="eyebrow">${esc(item.category)}</p>
            <h3>${esc(item.name)}</h3>
            <p>${esc(item.description)}</p>
            <strong class="dish__price">${euro.format(item.price)}</strong>
          </div>
          <div class="qty" aria-label="Quantita ${esc(item.name)}">
            <button type="button" data-action="decrement" aria-label="Rimuovi ${esc(item.name)}">-</button>
            <span>${quantity}</span>
            <button type="button" data-action="increment" aria-label="Aggiungi ${esc(item.name)}">+</button>
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
  refreshOrderSession();

  mount.addEventListener("click", (event) => {
    if (!activeTableSession?.active) {
      toast("Prenota un tavolo prima di ordinare.");
      return;
    }
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
    refreshOrderSession();
    if (!activeTableSession?.active) {
      toast("Prenotazione tavolo mancante o scaduta. Prenota un tavolo prima di ordinare.");
      return;
    }
    const items = [...orderDraft.values()];
    if (!items.length) {
      toast("Seleziona almeno un modulo culinario.");
      return;
    }
    let order;
    try {
      order = createOrder({ items });
    } catch (error) {
      refreshOrderSession();
      toast(error.message || "Ordine rifiutato: prenotazione tavolo non valida.");
      return;
    }
    orderDraft.clear();
    form.reset();
    renderOrderMenu();
    toast(`Ordine ${order.id} ricevuto per ${order.tableCode}.`);
  });

  qs("[data-clear-table-session]")?.addEventListener("click", () => {
    clearTableSession();
    activeTableSession = { active: false };
    orderDraft.clear();
    renderOrderMenu();
    renderOrderSession();
    toast("Sessione tavolo chiusa.");
  });
}

function refreshOrderSession() {
  activeTableSession = getTableSession();
  renderOrderSession();
}

function renderOrderSession() {
  const panel = qs("#orderSession");
  const form = qs("#orderForm");
  const submit = form?.querySelector("[type='submit']");
  const clearButton = qs("[data-clear-table-session]");
  if (!panel || !form || !submit) return;

  if (!activeTableSession?.active) {
    panel.innerHTML = `
      <span class="selected-card__kicker">Prenotazione richiesta</span>
      <strong>Nessun tavolo attivo</strong>
      <p>Prenota un tavolo prima di inviare ordinazioni.</p>
      <a class="button button--solid" href="prenotazione.html">Prenota tavolo</a>
    `;
    submit.disabled = true;
    if (clearButton) clearButton.disabled = true;
    return;
  }

  panel.innerHTML = `
    <span class="selected-card__kicker">Tavolo associato</span>
    <strong>${esc(activeTableSession.tableCode)}</strong>
    <p>Prenotazione ${esc(activeTableSession.reservationId)} verificata lato server.</p>
  `;
  submit.disabled = false;
  if (clearButton) clearButton.disabled = false;
}

function requestedPersons() {
  const value = Number(qs("#persons")?.value || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseBookingDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}$/.test(time || "")) {
    return null;
  }
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute
  ) {
    return null;
  }
  return value;
}

function minutesFromTime(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function bookingFitsOpeningWindow(start, durationMinutes, window) {
  const windowStart = minutesFromTime(window.start);
  let windowEnd = minutesFromTime(window.end);
  let normalizedStart = start;
  if (windowEnd <= windowStart) {
    windowEnd += 24 * 60;
    if (normalizedStart < windowStart) normalizedStart += 24 * 60;
  }
  return normalizedStart >= windowStart && normalizedStart + durationMinutes <= windowEnd;
}

function validateBookingSchedule({ date, time }) {
  const reservationAt = parseBookingDateTime(date, time);
  if (!reservationAt) return "Data o ora della prenotazione non valida.";

  const now = new Date();
  now.setSeconds(0, 0);
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + bookingMaxDaysAhead);

  if (reservationAt < now) {
    return "La prenotazione deve essere in un orario uguale o successivo a quello attuale.";
  }

  if (reservationAt > maxDate) {
    return `La prenotazione non puo superare i ${bookingMaxDaysAhead} giorni di anticipo.`;
  }

  const start = reservationAt.getHours() * 60 + reservationAt.getMinutes();
  const isOpen = bookingOpeningWindows.some((window) => bookingFitsOpeningWindow(start, bookingDurationMinutes, window));
  if (!isOpen) {
    return "Prenotazioni disponibili solo nella fascia 18:00-01:00; durata standard 2 ore.";
  }

  return "";
}

function setupBookingInputs() {
  const date = qs("#date");
  const time = qs("#time");
  if (!date || !time) return;
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + bookingMaxDaysAhead);
  date.min = localDateValue(today);
  date.max = localDateValue(maxDate);
  time.step = "900";
  if (!date.value) date.value = localDateValue(today);
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
  const tables = getTableStates({
    date: qs("#date")?.value || "",
    time: qs("#time")?.value || "",
    durationMinutes: bookingDurationMinutes,
  });
  bookingTableStates = tables;
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
        <strong>${esc(table.code.replace("TABLE-HUB-", "Tavolo "))}</strong>
        <span>${esc(canFit ? stateLabels[table.state] : "Troppo piccolo")}</span>
        <span class="table-node__capacity">${table.capacity} posti</span>
        <span class="table-node__meta">
          <span class="table-node__pill">${esc(table.priority)}</span>
          <span class="table-node__pill">${table.reservations.length} pren.</span>
        </span>
      </span>
    `;
    floor.append(button);
  });
  updateSelectedTablePanel(tables);
}

function updateSelectedTablePanel(tables = bookingTableStates) {
  const output = qs("#selectedTable");
  const state = qs("#selectedState");
  const capacity = qs("#selectedCapacity");
  const reservations = qs("#selectedReservations");
  const table = tables.find((item) => item.code === selectedTable);

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
  setupBookingInputs();

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
    const table = bookingTableStates.find((item) => item.code === node.dataset.table);
    if (!table) return;
    tooltip.innerHTML = `
      <strong>${esc(table.code)}</strong><br>
      STATO: ${esc(stateLabels[table.state])}<br>
      CAPIENZA: ${table.capacity} posti<br>
      PRIORITA: ${esc(table.priority)}<br>
      PRENOTAZIONI: ${table.reservations.length}
    `;
    tooltip.style.left = `${event.clientX + 16}px`;
    tooltip.style.top = `${event.clientY + 16}px`;
    tooltip.classList.add("is-visible");
  });

  floor.addEventListener("mouseleave", () => tooltip?.classList.remove("is-visible"));

  qs("#persons")?.addEventListener("input", renderBookingMap);
  qs("#date")?.addEventListener("change", renderBookingMap);
  qs("#time")?.addEventListener("input", renderBookingMap);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedTable) {
      toast("Seleziona un tavolo libero dalla planimetria.");
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const scheduleError = validateBookingSchedule(data);
    if (scheduleError) {
      toast(scheduleError);
      return;
    }

    const submit = form.querySelector("[type='submit']");
    if (submit) submit.disabled = true;
    try {
      const reservation = createReservation({ ...data, tableCode: selectedTable });
      form.reset();
      setupBookingInputs();
      selectedTable = "";
      renderBookingMap();
      setActiveRoute("");
      playConfirmation(reservation);
    } catch (error) {
      toast(error.message || "Prenotazione non riuscita. Controlla data, ora e disponibilita.");
    } finally {
      if (submit) submit.disabled = false;
    }
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
          <p class="eyebrow">${ratingHtml(review.stars)}</p>
          <h3>${esc(review.customerName)}</h3>
          <p>${esc(review.comment)}</p>
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
    <p class="eyebrow">${ratingHtml(selectedStars)}</p>
    <h3>${esc(data.customerName || "OPERATORE")}</h3>
    <p>${esc(data.comment || "Preview del feedback in attesa di trasmissione.")}</p>
  `;
}

function bootPage() {
  bindEasterEggs();
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
