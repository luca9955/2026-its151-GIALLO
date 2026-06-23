import { initializeDatabase, onDatabaseUpdate, getDashboardStats } from "./data/storage.js";
import { listMenu, removeMenuItem, upsertMenuItem } from "./data/repositories/menuRepository.js";
import { listOrders, updateOrderStatus } from "./data/repositories/orderRepository.js";
import { listReservations, updateReservationStatus } from "./data/repositories/reservationRepository.js";
import { listReviews, removeReview } from "./data/repositories/reviewRepository.js";

initializeDatabase();

const frame = document.querySelector("#adminFrame");
const nav = document.querySelector(".admin-nav");
let activeView = "dashboard";
let filterText = "";
let editingMenuId = null;

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const reservationStates = ["In attesa", "Approvata", "Rifiutata", "Terminata"];
const orderStates = ["Ricevuto", "Accettato", "In preparazione", "Pronto", "Consegnato"];
const defaultDishImage = "assets/images/menu-line.svg";

function css() {
  return `
    <style>
      :root{--orange:#ff6a00;--coal:#111;--steel:#222;--light:#ccc;--green:#3cff82;--red:#ff334f;--blue:#23a9ff;--font:"FicsitTech","Bahnschrift","Segoe UI",sans-serif}
      @font-face{font-family:FicsitTech;src:local("Bahnschrift"),local("Eurostile"),local("Orbitron");font-display:swap}
      *{box-sizing:border-box}body{margin:0;padding:18px;font-family:var(--font);letter-spacing:0;background:radial-gradient(circle at 18% 8%,rgba(255,106,0,.16),transparent 25rem),#080808;color:var(--light)}
      h2,h3,p{margin-top:0}h2{color:white;text-transform:uppercase;font-size:32px;line-height:1}.eyebrow{color:var(--orange);text-transform:uppercase;font-weight:900}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.panel{position:relative;padding:16px;border:1px solid rgba(255,106,0,.4);border-radius:8px;background:linear-gradient(135deg,rgba(255,106,0,.1),transparent 42%),linear-gradient(180deg,rgba(35,35,35,.96),rgba(8,8,8,.96));box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),0 20px 70px rgba(0,0,0,.28)}
      .panel::before{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(90deg,var(--orange) 0 18%,transparent 18% 100%) top/100% 3px no-repeat}
      .value{display:block;color:var(--orange);font-size:40px;font-weight:900}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px}.input,.select,textarea{min-height:44px;border:1px solid rgba(204,204,204,.24);background:rgba(0,0,0,.58);color:white;padding:10px;font:inherit;border-radius:4px}.input:focus,.select:focus,textarea:focus{outline:none;border-color:var(--orange);box-shadow:0 0 0 3px rgba(255,106,0,.15)}.button{min-height:42px;border:1px solid rgba(255,106,0,.65);background:linear-gradient(180deg,#ff7a1f,#ff6a00);color:#111;font-weight:900;text-transform:uppercase;cursor:pointer;border-radius:4px;padding:8px 12px}.button:hover{filter:brightness(1.08);box-shadow:0 0 22px rgba(255,106,0,.26)}
      table{width:100%;border-collapse:collapse;background:rgba(0,0,0,.28)}th,td{padding:10px;border-bottom:1px solid rgba(255,106,0,.18);text-align:left;vertical-align:top}th{color:var(--orange);text-transform:uppercase;font-size:12px}.actions{display:flex;gap:8px;flex-wrap:wrap}.danger{background:transparent;color:var(--red);border-color:var(--red)}.ghost{background:transparent;color:#fff}.muted{color:#888}.form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}.full{grid-column:1/-1}.chart{width:100%;height:170px}.ring{width:132px;height:132px}.badge{display:inline-flex;padding:4px 8px;border:1px solid rgba(255,106,0,.4);color:white}.empty{padding:28px;border:1px dashed rgba(255,106,0,.35);text-align:center}.available{color:var(--green)}
      .admin-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:12px;align-items:stretch;margin-bottom:14px}.admin-hero__visual{min-height:220px;border:1px solid rgba(255,106,0,.38);border-radius:8px;background:linear-gradient(90deg,rgba(0,0,0,.75),rgba(0,0,0,.2)),url("assets/images/generated-admin-control.png") center/cover;box-shadow:inset 0 0 80px rgba(0,0,0,.55)}
      .menu-workbench{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(0,1.1fr);gap:14px;align-items:start}.menu-preview{display:grid;gap:10px}.menu-preview__image{width:100%;aspect-ratio:16/10;object-fit:cover;border:1px solid rgba(255,106,0,.45);border-radius:6px;background:#111}.menu-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.menu-card{overflow:hidden;padding:0}.menu-card__image{width:100%;aspect-ratio:16/9;object-fit:cover;border-bottom:1px solid rgba(255,106,0,.3)}.menu-card__body{padding:14px}.menu-card__meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.price{color:var(--orange);font-size:24px;font-weight:900}
      @media(max-width:860px){.admin-hero,.menu-workbench{grid-template-columns:1fr}.form{grid-template-columns:1fr}table{font-size:13px}}
    </style>
  `;
}

function page(body) {
  frame.srcdoc = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css()}</head><body>${body}</body></html>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function renderDashboard() {
  const stats = getDashboardStats();
  const orders = listOrders();
  const reservations = listReservations();
  const revenueRatio = Math.min(100, Math.round((stats.dailyRevenue / 600) * 100));
  page(`
    <div class="admin-hero">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h2>Telemetry core</h2>
        <p class="muted">Monitor operativo realtime per prenotazioni, ordini, feedback e incasso giornaliero.</p>
      </div>
      <div class="admin-hero__visual" aria-hidden="true"></div>
    </div>
    <div class="grid">
      <article class="panel"><span>Prenotazioni oggi</span><strong class="value">${stats.reservationsToday}</strong></article>
      <article class="panel"><span>Ordini attivi</span><strong class="value">${stats.activeOrders}</strong></article>
      <article class="panel"><span>Recensioni</span><strong class="value">${stats.reviewCount}</strong></article>
      <article class="panel"><span>Incasso giornaliero</span><strong class="value">${euro.format(stats.dailyRevenue)}</strong></article>
    </div>
    <div class="grid" style="margin-top:12px">
      <article class="panel">
        <p class="eyebrow">Revenue ring</p>
        <svg class="ring" viewBox="0 0 120 120" role="img" aria-label="Progress ring incasso">
          <circle cx="60" cy="60" r="48" fill="none" stroke="#222" stroke-width="14"/>
          <circle cx="60" cy="60" r="48" fill="none" stroke="#ff6a00" stroke-width="14" stroke-linecap="round" stroke-dasharray="${revenueRatio * 3.02} 302" transform="rotate(-90 60 60)"/>
          <text x="60" y="66" fill="#fff" text-anchor="middle" font-size="20">${revenueRatio}%</text>
        </svg>
      </article>
      <article class="panel">
        <p class="eyebrow">Order flow</p>
        <svg class="chart" viewBox="0 0 520 170" role="img" aria-label="Grafico ordini e prenotazioni">
          <polyline points="20,130 110,95 200,115 290,55 380,80 500,35" fill="none" stroke="#ff6a00" stroke-width="8" stroke-linecap="round"/>
          <polyline points="20,145 110,125 200,120 290,105 380,96 500,70" fill="none" stroke="#23a9ff" stroke-width="5" stroke-linecap="round"/>
          ${[20,110,200,290,380,500].map((x) => `<circle cx="${x}" cy="${Math.max(35, 145 - (orders.length + reservations.length) * 9)}" r="5" fill="#ccc"/>`).join("")}
        </svg>
      </article>
    </div>
    <article class="panel" style="margin-top:12px">
      <p class="eyebrow">Activity feed</p>
      ${(orders[0] || reservations[0]) ? `
        <p>Ultimo ordine: ${orders[0] ? esc(orders[0].id) + " / " + esc(orders[0].status) : "Nessuno"}</p>
        <p>Ultima prenotazione: ${reservations[0] ? esc(reservations[0].id) + " / " + esc(reservations[0].status) : "Nessuna"}</p>
      ` : `<div class="empty">Nessun segnale operativo ancora registrato.</div>`}
    </article>
  `);
}

function renderMenu() {
  const items = listMenu();
  const editingItem = items.find((item) => item.id === editingMenuId);
  const formImage = editingItem?.image || defaultDishImage;
  page(`
    <div class="admin-hero">
      <div>
        <p class="eyebrow">Menu fabrication bay</p>
        <h2>${editingItem ? "Modifica piatto" : "Gestione menu"}</h2>
        <p class="muted">Aggiorna catalogo, disponibilita e immagini. Ogni salvataggio viene propagato subito al menu cliente.</p>
      </div>
      <div class="admin-hero__visual" aria-hidden="true"></div>
    </div>
    <div class="menu-workbench">
      <form class="panel form" data-admin-form="menu">
        <input type="hidden" name="id" value="${esc(editingItem?.id || "")}">
        <input type="hidden" name="existingImage" value="${esc(formImage)}">
        <div class="menu-preview full">
          <img class="menu-preview__image" data-preview-image src="${esc(formImage)}" alt="Anteprima immagine piatto">
        </div>
        <input class="input" name="name" placeholder="Nome piatto" value="${esc(editingItem?.name || "")}" required>
        <input class="input" name="category" placeholder="Categoria" value="${esc(editingItem?.category || "")}" required>
        <input class="input" name="price" placeholder="Prezzo" type="number" min="0" step="0.01" value="${esc(editingItem?.price || "")}" required>
        <input class="input" name="image" placeholder="URL immagine opzionale" value="${esc(editingItem?.image?.startsWith("data:") ? "" : editingItem?.image || "")}">
        <input class="input full" name="imageFile" type="file" accept="image/*" data-action="preview-image">
        <textarea class="input full" name="description" placeholder="Descrizione" required>${esc(editingItem?.description || "")}</textarea>
        <label class="full"><input name="available" type="checkbox" ${editingItem?.available === false ? "" : "checked"}> Disponibile nel menu cliente</label>
        <div class="actions full">
          <button class="button" type="submit">${editingItem ? "Aggiorna piatto" : "Crea piatto"}</button>
          ${editingItem ? `<button class="button ghost" type="button" data-action="cancel-edit">Annulla modifica</button>` : ""}
        </div>
      </form>
      <section>
        <div class="toolbar">
          <input class="input" data-action="filter" placeholder="Cerca nel menu" value="${esc(filterText)}">
          <button class="button ghost" data-action="clear-filter">Reset</button>
        </div>
        <div class="menu-card-grid">
          ${items
            .filter((item) => JSON.stringify(item).toLowerCase().includes(filterText.toLowerCase()))
            .map(
              (item) => `
                <article class="panel menu-card">
                  <img class="menu-card__image" src="${esc(item.image)}" alt="${esc(item.name)}">
                  <div class="menu-card__body">
                    <p class="eyebrow">${esc(item.category)}</p>
                    <h3>${esc(item.name)}</h3>
                    <p>${esc(item.description)}</p>
                    <div class="menu-card__meta">
                      <strong class="price">${euro.format(item.price)}</strong>
                      <span class="${item.available ? "available" : "muted"}">${item.available ? "ONLINE" : "OFFLINE"}</span>
                    </div>
                    <div class="actions" style="margin-top:12px">
                      <button class="button ghost" data-action="edit-menu" data-id="${item.id}">Modifica</button>
                      <button class="button danger" data-action="delete-menu" data-id="${item.id}">Elimina</button>
                    </div>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    </div>
  `);
}

function renderReservations() {
  const rows = listReservations().filter((item) => JSON.stringify(item).toLowerCase().includes(filterText.toLowerCase()));
  page(`
    <p class="eyebrow">Reservations repository</p>
    <h2>Prenotazioni</h2>
    ${toolbar("Cerca cliente, tavolo o data")}
    ${table(["ID", "Cliente", "Tavolo", "Data", "Ora", "Persone", "Stato"], rows.map((item) => [
      esc(item.id),
      `${esc(item.firstName)} ${esc(item.lastName)}<br><span class="muted">${esc(item.email)}</span>`,
      esc(item.tableCode),
      esc(item.date),
      esc(item.time),
      esc(item.persons),
      stateSelect("reservation", item.id, item.status, reservationStates),
    ]))}
  `);
}

function renderOrders() {
  const rows = listOrders().filter((item) => JSON.stringify(item).toLowerCase().includes(filterText.toLowerCase()));
  page(`
    <p class="eyebrow">Dispatch repository</p>
    <h2>Ordinazioni</h2>
    ${toolbar("Cerca tavolo, ordine o stato")}
    ${table(["ID", "Tavolo", "Prenotazione", "Items", "Totale", "Stato"], rows.map((item) => [
      esc(item.id),
      esc(item.tableCode || "Tavolo non disponibile"),
      esc(item.reservationId || "-"),
      item.items.map((entry) => `${esc(entry.name)} x${entry.quantity}`).join("<br>"),
      euro.format(item.total),
      stateSelect("order", item.id, item.status, orderStates),
    ]))}
  `);
}

function renderReviews() {
  const rows = listReviews().filter((item) => JSON.stringify(item).toLowerCase().includes(filterText.toLowerCase()));
  page(`
    <p class="eyebrow">Feedback repository</p>
    <h2>Recensioni</h2>
    ${toolbar("Cerca recensioni")}
    ${table(["Cliente", "Rating", "Commento", "Azioni"], rows.map((item) => [
      esc(item.customerName),
      "★".repeat(item.stars) + "☆".repeat(5 - item.stars),
      esc(item.comment),
      `<button class="button danger" data-action="delete-review" data-id="${item.id}">Elimina</button>`,
    ]))}
  `);
}

function toolbar(placeholder) {
  return `<div class="toolbar"><input class="input" data-action="filter" placeholder="${placeholder}" value="${esc(filterText)}"><button class="button" data-action="clear-filter">Reset</button></div>`;
}

function table(headers, rows) {
  if (!rows.length) return `<div class="empty">Nessun record disponibile nel database simulato.</div>`;
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function stateSelect(type, id, current, values) {
  return `
    <select class="select" data-action="state" data-type="${type}" data-id="${id}">
      ${values.map((value) => `<option value="${value}" ${value === current ? "selected" : ""}>${value}</option>`).join("")}
    </select>
  `;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function compressMenuImage(file) {
  if (!file) return "";
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function resolveMenuImage(form, data) {
  const file = form.querySelector("[name='imageFile']")?.files?.[0];
  if (file) {
    return compressMenuImage(file);
  }
  return data.image?.trim() || data.existingImage || defaultDishImage;
}

function render() {
  document.querySelectorAll(".admin-nav__button[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeView);
  });
  if (activeView === "dashboard") renderDashboard();
  if (activeView === "menu") renderMenu();
  if (activeView === "reservations") renderReservations();
  if (activeView === "orders") renderOrders();
  if (activeView === "reviews") renderReviews();
}

nav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  activeView = button.dataset.view;
  filterText = "";
  render();
});

frame.addEventListener("load", () => {
  const doc = frame.contentDocument;
  doc.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (action === "edit-menu") {
      editingMenuId = event.target.dataset.id;
      render();
    }
    if (action === "cancel-edit") {
      editingMenuId = null;
      render();
    }
    if (action === "delete-menu") {
      removeMenuItem(event.target.dataset.id);
      if (editingMenuId === event.target.dataset.id) {
        editingMenuId = null;
      }
      render();
    }
    if (action === "delete-review") {
      removeReview(event.target.dataset.id);
      render();
    }
    if (action === "clear-filter") {
      filterText = "";
      render();
    }
  });

  doc.addEventListener("input", (event) => {
    if (event.target.dataset.action === "filter") {
      filterText = event.target.value;
      render();
    }
  });

  doc.addEventListener("change", (event) => {
    if (event.target.dataset.action === "preview-image") {
      const file = event.target.files?.[0];
      const preview = doc.querySelector("[data-preview-image]");
      if (file && preview) {
        readFileAsDataUrl(file).then((dataUrl) => {
          preview.src = dataUrl;
        });
      }
      return;
    }
    if (event.target.dataset.action !== "state") return;
    if (event.target.dataset.type === "reservation") {
      updateReservationStatus(event.target.dataset.id, event.target.value);
    }
    if (event.target.dataset.type === "order") {
      updateOrderStatus(event.target.dataset.id, event.target.value);
    }
    render();
  });

  doc.addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-admin-form='menu']")) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const image = await resolveMenuImage(event.target, data);
    upsertMenuItem({
      id: data.id || undefined,
      name: data.name,
      category: data.category,
      description: data.description,
      price: data.price,
      image,
      available: data.available === "on",
    });
    editingMenuId = null;
    render();
  });
});

onDatabaseUpdate(render);
render();
