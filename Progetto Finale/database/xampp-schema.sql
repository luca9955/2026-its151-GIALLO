CREATE DATABASE IF NOT EXISTS ficsit_restaurant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ficsit_restaurant;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  cognome VARCHAR(80) NOT NULL,
  email VARCHAR(160) NOT NULL,
  telefono VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY users_email_unique (email)
);

CREATE TABLE IF NOT EXISTS tables (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  capacity INT NOT NULL,
  status ENUM('libero', 'prenotato', 'occupato') NOT NULL DEFAULT 'libero',
  position_x DECIMAL(8,2) NOT NULL DEFAULT 0,
  position_y DECIMAL(8,2) NOT NULL DEFAULT 0,
  position_z DECIMAL(8,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(40) PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  table_code VARCHAR(40) NOT NULL,
  persons INT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status ENUM('In attesa', 'Approvata', 'Rifiutata') NOT NULL DEFAULT 'In attesa',
  session_token_hash CHAR(64) NULL,
  session_expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY reservations_session_token_unique (session_token_hash),
  INDEX reservations_table_slot_idx (table_code, date, time, status),
  CONSTRAINT reservations_user_fk FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT reservations_table_fk FOREIGN KEY (table_code) REFERENCES tables(code)
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(40) PRIMARY KEY,
  reservation_id VARCHAR(40) NULL,
  table_code VARCHAR(40) NULL,
  customer_name VARCHAR(160) NULL,
  items_json JSON NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('Ricevuto', 'Accettato', 'In preparazione', 'Pronto', 'Consegnato') NOT NULL DEFAULT 'Ricevuto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT orders_reservation_fk FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  CONSTRAINT orders_table_fk FOREIGN KEY (table_code) REFERENCES tables(code)
);

CREATE TABLE IF NOT EXISTS menu (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(255) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(40) PRIMARY KEY,
  customer_name VARCHAR(160) NOT NULL,
  stars TINYINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tables (code, capacity, status, position_x, position_y, position_z) VALUES
  ('TABLE-HUB-01', 2, 'libero', 1, 1, 0),
  ('TABLE-HUB-02', 4, 'libero', 2, 1, 0),
  ('TABLE-HUB-03', 4, 'libero', 3, 1, 0),
  ('TABLE-HUB-04', 6, 'libero', 4, 1, 0),
  ('TABLE-HUB-05', 2, 'libero', 1, 2, 0),
  ('TABLE-HUB-06', 8, 'libero', 2, 2, 0),
  ('TABLE-HUB-07', 4, 'libero', 3, 2, 0),
  ('TABLE-HUB-08', 6, 'libero', 4, 2, 0),
  ('TABLE-HUB-09', 4, 'libero', 1, 3, 0),
  ('TABLE-HUB-10', 2, 'libero', 2, 3, 0),
  ('TABLE-HUB-11', 8, 'libero', 3, 3, 0),
  ('TABLE-HUB-12', 4, 'libero', 4, 3, 0),
  ('TABLE-HUB-13', 6, 'libero', 1, 4, 0),
  ('TABLE-HUB-14', 4, 'libero', 2, 4, 0),
  ('TABLE-HUB-15', 2, 'libero', 3, 4, 0),
  ('TABLE-HUB-16', 6, 'libero', 4, 4, 0)
ON DUPLICATE KEY UPDATE
  capacity = VALUES(capacity),
  position_x = VALUES(position_x),
  position_y = VALUES(position_y);

INSERT INTO menu (id, name, category, description, price, image, available) VALUES
  ('MENU-001', 'Assembler Burger', 'Moduli Caldi', 'Doppio smash burger, cheddar fuso, cipolla caramellata e salsa arancio industriale.', 15.50, 'assets/images/menu/assembler-burger.png', TRUE),
  ('MENU-002', 'Conveyor Ribs', 'Linea Proteica', 'Costine glassate a bassa temperatura con riduzione affumicata e chips di patate.', 21.00, 'assets/images/menu/conveyor-ribs.png', TRUE),
  ('MENU-003', 'Power Slug Salad', 'Biomassa Premium', 'Insalata croccante con avocado, semi tostati, lime e dressing verde luminoso.', 12.00, 'assets/images/menu/power-slug-salad.png', TRUE),
  ('MENU-004', 'Foundry Carbonara', 'Pasta Fusa', 'Carbonara cremosa con guanciale croccante e pepe tostato su piatto in acciaio.', 14.00, 'assets/images/menu/foundry-carbonara.png', TRUE),
  ('MENU-005', 'Space Elevator Sundae', 'Dessert Logistici', 'Gelato vaniglia, crumble cacao, caramello salato e granella arancio.', 8.00, 'assets/images/menu/space-elevator-sundae.png', TRUE),
  ('MENU-006', 'Budino Ficsit', 'Dessert Logistici', 'Budino al cioccolato di sterco di bonobo', 8.50, 'assets/images/menu/budino-ficsit.png', TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  category = VALUES(category),
  description = VALUES(description),
  price = VALUES(price),
  image = VALUES(image),
  available = VALUES(available);

INSERT INTO reviews (id, customer_name, stars, comment) VALUES
  ('REV-SEED-001', 'Ada', 5, 'Interfaccia operativa impeccabile e burger calibrato al millimetro.')
ON DUPLICATE KEY UPDATE
  customer_name = VALUES(customer_name),
  stars = VALUES(stars),
  comment = VALUES(comment);
