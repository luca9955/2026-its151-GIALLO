import { getMenu, saveMenu } from "../storage.js";

export function listMenu({ onlyAvailable = false } = {}) {
  const menu = getMenu();
  return onlyAvailable ? menu.filter((item) => item.available) : menu;
}

export function upsertMenuItem(item) {
  const menu = getMenu();
  const normalized = {
    id: item.id || `MENU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    name: item.name.trim(),
    category: item.category.trim(),
    description: item.description.trim(),
    price: Number(item.price),
    image: item.image?.trim() || "assets/images/menu-line.svg",
    available: Boolean(item.available),
  };
  const exists = menu.some((entry) => entry.id === normalized.id);
  saveMenu(exists ? menu.map((entry) => (entry.id === normalized.id ? normalized : entry)) : [normalized, ...menu]);
  return normalized;
}

export function removeMenuItem(id) {
  saveMenu(getMenu().filter((item) => item.id !== id));
}
