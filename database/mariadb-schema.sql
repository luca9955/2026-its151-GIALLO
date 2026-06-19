CREATE DATABASE IF NOT EXISTS ficsit_restaurant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ficsit_restaurant;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  cognome VARCHAR(80) NOT NULL,
  email VARCHAR(160) NOT NULL,
  telefono VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY users_email_unique (email)
);

CREATE TABLE tables (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  capacity INT NOT NULL,
  status ENUM('libero', 'prenotato', 'occupato') NOT NULL DEFAULT 'libero',
  position_x DECIMAL(8,2) NOT NULL DEFAULT 0,
  position_y DECIMAL(8,2) NOT NULL DEFAULT 0,
  position_z DECIMAL(8,2) NOT NULL DEFAULT 0
);

CREATE TABLE reservations (
  id VARCHAR(40) PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  table_code VARCHAR(40) NOT NULL,
  persons INT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status ENUM('In attesa', 'Approvata', 'Rifiutata') NOT NULL DEFAULT 'In attesa',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT reservations_user_fk FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT reservations_table_fk FOREIGN KEY (table_code) REFERENCES tables(code)
);

CREATE TABLE orders (
  id VARCHAR(40) PRIMARY KEY,
  reservation_id VARCHAR(40) NULL,
  customer_name VARCHAR(160) NOT NULL,
  items_json JSON NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('Ricevuto', 'Accettato', 'In preparazione', 'Pronto', 'Consegnato') NOT NULL DEFAULT 'Ricevuto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT orders_reservation_fk FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);

CREATE TABLE menu (
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

CREATE TABLE reviews (
  id VARCHAR(40) PRIMARY KEY,
  customer_name VARCHAR(160) NOT NULL,
  stars TINYINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
