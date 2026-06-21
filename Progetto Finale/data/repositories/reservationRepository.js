import { getReservations, saveReservations } from "../storage.js";
import { DATABASE_MODE } from "../database-config.js";
import { requestJsonSync } from "../api/apiClient.js";

export const TABLES = Array.from({ length: 16 }, (_, index) => {
  const id = index + 1;
  const capacities = [2, 4, 4, 6, 2, 8, 4, 6, 4, 2, 8, 4, 6, 4, 2, 6];
  return {
    code: `TABLE-HUB-${String(id).padStart(2, "0")}`,
    capacity: capacities[index],
    priority: id % 4 === 0 ? "HIGH" : id % 3 === 0 ? "MED" : "STD",
    x: (index % 4) + 1,
    y: Math.floor(index / 4) + 1,
  };
});

export function listReservations() {
  return readReservations().sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

function readReservations() {
  if (DATABASE_MODE === "XAMPP") {
    return requestJsonSync("/reservations");
  }

  return getReservations();
}

export function createReservation(data) {
  if (DATABASE_MODE === "XAMPP") {
    return requestJsonSync("/reservations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  const reservation = {
    id: `RES-${Date.now().toString(36).toUpperCase()}`,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    persons: Number(data.persons),
    date: data.date,
    time: data.time,
    tableCode: data.tableCode,
    status: "In attesa",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveReservations([reservation, ...getReservations()]);
  return reservation;
}

export function getTableSession() {
  if (DATABASE_MODE === "XAMPP") {
    try {
      return requestJsonSync("/table-session");
    } catch (error) {
      return { active: false };
    }
  }

  return { active: true, tableCode: "LOCAL" };
}

export function clearTableSession() {
  if (DATABASE_MODE === "XAMPP") {
    requestJsonSync("/table-session", { method: "DELETE" });
  }
}

export function updateReservationStatus(id, status) {
  saveReservations(
    readReservations().map((reservation) =>
      reservation.id === id ? { ...reservation, status, updatedAt: new Date().toISOString() } : reservation,
    ),
  );
}

export function removeReservation(id) {
  saveReservations(readReservations().filter((reservation) => reservation.id !== id));
}

export function getTableStates() {
  const activeReservations = readReservations().filter((reservation) => ["In attesa", "Approvata"].includes(reservation.status));
  return TABLES.map((table) => {
    const reservations = activeReservations.filter((reservation) => reservation.tableCode === table.code);
    const hasApproved = reservations.some((reservation) => reservation.status === "Approvata");
    return {
      ...table,
      state: hasApproved ? "occupato" : reservations.length ? "prenotato" : "libero",
      reservations,
    };
  });
}
