CREATE DATABASE IF NOT EXISTS ficsit_restaurant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'ficsit_app'@'localhost'
  IDENTIFIED BY 'ficsit_app_password';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER
  ON ficsit_restaurant.*
  TO 'ficsit_app'@'localhost';

FLUSH PRIVILEGES;
