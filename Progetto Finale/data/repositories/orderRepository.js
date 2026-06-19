import { getOrders, saveOrders } from "../storage.js";

export function listOrders() {
  return getOrders().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createOrder({ customerName, items }) {
  const normalizedItems = items
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));
  const total = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = {
    id: `ORD-${Date.now().toString(36).toUpperCase()}`,
    reservationId: null,
    customerName: customerName.trim(),
    items: normalizedItems,
    total,
    status: "Ricevuto",
    createdAt: new Date().toISOString(),
  };
  saveOrders([order, ...getOrders()]);
  return order;
}

export function updateOrderStatus(id, status) {
  saveOrders(getOrders().map((order) => (order.id === id ? { ...order, status } : order)));
}
