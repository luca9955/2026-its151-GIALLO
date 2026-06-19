<?php
declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_PORT = '3306';
const DB_NAME = 'ficsit_restaurant';
const DB_USER = 'root';
const DB_PASSWORD = '';

function json_response(mixed $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(Throwable $error): void
{
    json_response(['error' => $error->getMessage()], 500);
}

function server_pdo(): PDO
{
    return new PDO(
        'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';charset=utf8mb4',
        DB_USER,
        DB_PASSWORD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ],
    );
}

function db(): PDO
{
    $server = server_pdo();
    $server->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASSWORD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ],
    );

    initialize_schema($pdo);
    seed_database($pdo);
    return $pdo;
}

function initialize_schema(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(80) NOT NULL,
          cognome VARCHAR(80) NOT NULL,
          email VARCHAR(160) NOT NULL,
          telefono VARCHAR(40) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY users_email_unique (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS tables (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(40) NOT NULL UNIQUE,
          capacity INT NOT NULL,
          status ENUM('libero', 'prenotato', 'occupato') NOT NULL DEFAULT 'libero',
          position_x DECIMAL(8,2) NOT NULL DEFAULT 0,
          position_y DECIMAL(8,2) NOT NULL DEFAULT 0,
          position_z DECIMAL(8,2) NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reservations (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(40) PRIMARY KEY,
          reservation_id VARCHAR(40) NULL,
          customer_name VARCHAR(160) NOT NULL,
          items_json JSON NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          status ENUM('Ricevuto', 'Accettato', 'In preparazione', 'Pronto', 'Consegnato') NOT NULL DEFAULT 'Ricevuto',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT orders_reservation_fk FOREIGN KEY (reservation_id) REFERENCES reservations(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reviews (
          id VARCHAR(40) PRIMARY KEY,
          customer_name VARCHAR(160) NOT NULL,
          stars TINYINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
          comment TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function seed_database(PDO $pdo): void
{
    $tables = [
        ['TABLE-HUB-01', 2, 1, 1], ['TABLE-HUB-02', 4, 2, 1], ['TABLE-HUB-03', 4, 3, 1], ['TABLE-HUB-04', 6, 4, 1],
        ['TABLE-HUB-05', 2, 1, 2], ['TABLE-HUB-06', 8, 2, 2], ['TABLE-HUB-07', 4, 3, 2], ['TABLE-HUB-08', 6, 4, 2],
        ['TABLE-HUB-09', 4, 1, 3], ['TABLE-HUB-10', 2, 2, 3], ['TABLE-HUB-11', 8, 3, 3], ['TABLE-HUB-12', 4, 4, 3],
        ['TABLE-HUB-13', 6, 1, 4], ['TABLE-HUB-14', 4, 2, 4], ['TABLE-HUB-15', 2, 3, 4], ['TABLE-HUB-16', 6, 4, 4],
    ];
    $tableStatement = $pdo->prepare("
        INSERT INTO tables (code, capacity, position_x, position_y, position_z)
        VALUES (?, ?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), position_x = VALUES(position_x), position_y = VALUES(position_y)
    ");
    foreach ($tables as $table) {
        $tableStatement->execute($table);
    }

    $menuCount = (int) $pdo->query('SELECT COUNT(*) FROM menu')->fetchColumn();
    if ($menuCount === 0) {
        $menu = [
            ['MENU-001', 'Assembler Burger', 'Moduli Caldi', 'Doppio smash burger, cheddar fuso, cipolla caramellata e salsa arancio industriale.', 15.50, 'assets/images/menu/assembler-burger.png', 1],
            ['MENU-002', 'Conveyor Ribs', 'Linea Proteica', 'Costine glassate a bassa temperatura con riduzione affumicata e chips di patate.', 21.00, 'assets/images/menu/conveyor-ribs.png', 1],
            ['MENU-003', 'Power Slug Salad', 'Biomassa Premium', 'Insalata croccante con avocado, semi tostati, lime e dressing verde luminoso.', 12.00, 'assets/images/menu/power-slug-salad.png', 1],
            ['MENU-004', 'Foundry Carbonara', 'Pasta Fusa', 'Carbonara cremosa con guanciale croccante e pepe tostato su piatto in acciaio.', 14.00, 'assets/images/menu/foundry-carbonara.png', 1],
            ['MENU-005', 'Space Elevator Sundae', 'Dessert Logistici', 'Gelato vaniglia, crumble cacao, caramello salato e granella arancio.', 8.00, 'assets/images/menu/space-elevator-sundae.png', 1],
        ];
        $menuStatement = $pdo->prepare('INSERT INTO menu (id, name, category, description, price, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)');
        foreach ($menu as $item) {
            $menuStatement->execute($item);
        }
    }

    $reviewCount = (int) $pdo->query('SELECT COUNT(*) FROM reviews')->fetchColumn();
    if ($reviewCount === 0) {
        $pdo->prepare('INSERT INTO reviews (id, customer_name, stars, comment) VALUES (?, ?, ?, ?)')
            ->execute(['REV-SEED-001', 'Ada', 5, 'Interfaccia operativa impeccabile e burger calibrato al millimetro.']);
    }
}

function read_database(PDO $pdo): array
{
    $menu = array_map('map_menu_item', $pdo->query('SELECT id, name, category, description, price, image, available FROM menu ORDER BY category, name')->fetchAll());
    $reservations = array_map('map_reservation', $pdo->query('SELECT r.*, u.nome, u.cognome, u.email, u.telefono FROM reservations r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.date DESC, r.time DESC')->fetchAll());
    $orders = array_map('map_order', $pdo->query('SELECT id, reservation_id, customer_name, items_json, total, status, created_at FROM orders ORDER BY created_at DESC')->fetchAll());
    $reviews = array_map('map_review', $pdo->query('SELECT id, customer_name, stars, comment, created_at FROM reviews ORDER BY created_at DESC')->fetchAll());

    return [
        'version' => 1,
        'menu' => $menu,
        'reservations' => $reservations,
        'orders' => $orders,
        'reviews' => $reviews,
    ];
}

function map_menu_item(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'category' => $row['category'],
        'description' => $row['description'],
        'price' => (float) $row['price'],
        'image' => $row['image'],
        'available' => (bool) $row['available'],
    ];
}

function map_reservation(array $row): array
{
    return [
        'id' => $row['id'],
        'firstName' => $row['nome'] ?? '',
        'lastName' => $row['cognome'] ?? '',
        'phone' => $row['telefono'] ?? '',
        'email' => $row['email'] ?? '',
        'persons' => (int) $row['persons'],
        'date' => substr((string) $row['date'], 0, 10),
        'time' => substr((string) $row['time'], 0, 5),
        'tableCode' => $row['table_code'],
        'status' => $row['status'],
        'createdAt' => date(DATE_ATOM, strtotime((string) $row['created_at'])),
        'updatedAt' => date(DATE_ATOM, strtotime((string) $row['updated_at'])),
    ];
}

function map_order(array $row): array
{
    return [
        'id' => $row['id'],
        'reservationId' => $row['reservation_id'],
        'customerName' => $row['customer_name'],
        'items' => json_decode((string) $row['items_json'], true) ?: [],
        'total' => (float) $row['total'],
        'status' => $row['status'],
        'createdAt' => date(DATE_ATOM, strtotime((string) $row['created_at'])),
    ];
}

function map_review(array $row): array
{
    return [
        'id' => $row['id'],
        'customerName' => $row['customer_name'],
        'stars' => (int) $row['stars'],
        'comment' => $row['comment'],
        'createdAt' => date(DATE_ATOM, strtotime((string) $row['created_at'])),
    ];
}

function replace_database(PDO $pdo, array $database): array
{
    $pdo->beginTransaction();
    try {
        replace_menu($pdo, $database['menu'] ?? []);
        replace_reservations($pdo, $database['reservations'] ?? []);
        replace_orders($pdo, $database['orders'] ?? []);
        replace_reviews($pdo, $database['reviews'] ?? []);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    return read_database($pdo);
}

function replace_menu(PDO $pdo, array $menu): void
{
    $pdo->exec('DELETE FROM menu');
    $statement = $pdo->prepare('INSERT INTO menu (id, name, category, description, price, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)');
    foreach ($menu as $item) {
        $statement->execute([
            $item['id'],
            $item['name'],
            $item['category'],
            $item['description'],
            (float) $item['price'],
            $item['image'],
            !empty($item['available']) ? 1 : 0,
        ]);
    }
}

function upsert_user(PDO $pdo, array $reservation): int
{
    $email = $reservation['email'] ?: strtolower($reservation['id']) . '@local.ficsit';
    $statement = $pdo->prepare('
        INSERT INTO users (nome, cognome, email, telefono)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE nome = VALUES(nome), cognome = VALUES(cognome), telefono = VALUES(telefono)
    ');
    $statement->execute([
        $reservation['firstName'] ?? '',
        $reservation['lastName'] ?? '',
        $email,
        $reservation['phone'] ?? '',
    ]);

    $select = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $select->execute([$email]);
    return (int) $select->fetchColumn();
}

function replace_reservations(PDO $pdo, array $reservations): void
{
    $pdo->exec('DELETE FROM orders');
    $pdo->exec('DELETE FROM reservations');
    $statement = $pdo->prepare('
        INSERT INTO reservations (id, user_id, table_code, persons, date, time, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    foreach ($reservations as $reservation) {
        $statement->execute([
            $reservation['id'],
            upsert_user($pdo, $reservation),
            $reservation['tableCode'],
            (int) $reservation['persons'],
            $reservation['date'],
            $reservation['time'],
            $reservation['status'] ?? 'In attesa',
            date('Y-m-d H:i:s', strtotime($reservation['createdAt'] ?? 'now')),
            date('Y-m-d H:i:s', strtotime($reservation['updatedAt'] ?? 'now')),
        ]);
    }
}

function replace_orders(PDO $pdo, array $orders): void
{
    $pdo->exec('DELETE FROM orders');
    $statement = $pdo->prepare('INSERT INTO orders (id, reservation_id, customer_name, items_json, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    foreach ($orders as $order) {
        $statement->execute([
            $order['id'],
            $order['reservationId'] ?? null,
            $order['customerName'],
            json_encode($order['items'] ?? [], JSON_UNESCAPED_UNICODE),
            (float) $order['total'],
            $order['status'] ?? 'Ricevuto',
            date('Y-m-d H:i:s', strtotime($order['createdAt'] ?? 'now')),
        ]);
    }
}

function replace_reviews(PDO $pdo, array $reviews): void
{
    $pdo->exec('DELETE FROM reviews');
    $statement = $pdo->prepare('INSERT INTO reviews (id, customer_name, stars, comment, created_at) VALUES (?, ?, ?, ?, ?)');
    foreach ($reviews as $review) {
        $statement->execute([
            $review['id'],
            $review['customerName'],
            (int) $review['stars'],
            $review['comment'],
            date('Y-m-d H:i:s', strtotime($review['createdAt'] ?? 'now')),
        ]);
    }
}

function request_payload(): array
{
    $raw = file_get_contents('php://input') ?: '{}';
    $payload = json_decode($raw, true);
    return is_array($payload) ? $payload : [];
}
