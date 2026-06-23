<?php
declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_PORT = '3306';
const DB_NAME = 'ficsit_restaurant';
const DB_USER = 'root';
const DB_PASSWORD = '';
const TABLE_SESSION_COOKIE = 'ficsit_table_session';
const TABLE_SESSION_DURATION_SECONDS = 4 * 60 * 60;
const RESTAURANT_TIMEZONE = 'Europe/Rome';
const RESERVATION_DURATION_MINUTES = 120;
const RESERVATION_MAX_DAYS_AHEAD = 90;

function json_response(mixed $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(Throwable $error): void
{
    error_log($error->getMessage());
    json_response(['error' => 'Errore interno del server'], 500);
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
          session_token_hash CHAR(64) NULL,
          session_expires_at DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY reservations_session_token_unique (session_token_hash),
          CONSTRAINT reservations_user_fk FOREIGN KEY (user_id) REFERENCES users(id),
          CONSTRAINT reservations_table_fk FOREIGN KEY (table_code) REFERENCES tables(code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    ensure_column($pdo, 'reservations', 'session_token_hash', 'ALTER TABLE reservations ADD COLUMN session_token_hash CHAR(64) NULL AFTER status');
    ensure_column($pdo, 'reservations', 'session_expires_at', 'ALTER TABLE reservations ADD COLUMN session_expires_at DATETIME NULL AFTER session_token_hash');
    ensure_index($pdo, 'reservations', 'reservations_session_token_unique', 'ALTER TABLE reservations ADD UNIQUE KEY reservations_session_token_unique (session_token_hash)');
    ensure_index($pdo, 'reservations', 'reservations_table_slot_idx', 'ALTER TABLE reservations ADD INDEX reservations_table_slot_idx (table_code, date, time, status)');
    ensure_column($pdo, 'orders', 'table_code', 'ALTER TABLE orders ADD COLUMN table_code VARCHAR(40) NULL AFTER reservation_id');
    $pdo->exec('ALTER TABLE orders MODIFY customer_name VARCHAR(160) NULL');
    ensure_index($pdo, 'orders', 'orders_table_fk', 'ALTER TABLE orders ADD CONSTRAINT orders_table_fk FOREIGN KEY (table_code) REFERENCES tables(code)');

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

function ensure_column(PDO $pdo, string $table, string $column, string $sql): void
{
    $statement = $pdo->prepare('
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ');
    $statement->execute([$table, $column]);
    if ((int) $statement->fetchColumn() === 0) {
        $pdo->exec($sql);
    }
}

function ensure_index(PDO $pdo, string $table, string $index, string $sql): void
{
    $statement = $pdo->prepare('
        SELECT COUNT(*)
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
    ');
    $statement->execute([$table, $index]);
    if ((int) $statement->fetchColumn() === 0) {
        $pdo->exec($sql);
    }
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

    $menu = [
        ['MENU-001', 'Assembler Burger', 'Moduli Caldi', 'Doppio smash burger, cheddar fuso, cipolla caramellata e salsa arancio industriale.', 15.50, 'assets/images/menu/assembler-burger.png', 1],
        ['MENU-002', 'Conveyor Ribs', 'Linea Proteica', 'Costine glassate a bassa temperatura con riduzione affumicata e chips di patate.', 21.00, 'assets/images/menu/conveyor-ribs.png', 1],
        ['MENU-003', 'Power Slug Salad', 'Biomassa Premium', 'Insalata croccante con avocado, semi tostati, lime e dressing verde luminoso.', 12.00, 'assets/images/menu/power-slug-salad.png', 1],
        ['MENU-004', 'Foundry Carbonara', 'Pasta Fusa', 'Carbonara cremosa con guanciale croccante e pepe tostato su piatto in acciaio.', 14.00, 'assets/images/menu/foundry-carbonara.png', 1],
        ['MENU-005', 'Space Elevator Sundae', 'Dessert Logistici', 'Gelato vaniglia, crumble cacao, caramello salato e granella arancio.', 8.00, 'assets/images/menu/space-elevator-sundae.png', 1],
        ['MENU-006', 'Budino Ficsit', 'Dessert Logistici', 'Budino al cioccolato di sterco di bonobo', 8.50, 'assets/images/menu/budino-ficsit.png', 1],
    ];
    $menuStatement = $pdo->prepare('INSERT IGNORE INTO menu (id, name, category, description, price, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)');
    foreach ($menu as $item) {
        $menuStatement->execute($item);
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
    $orders = array_map('map_order', $pdo->query('
        SELECT o.id, o.reservation_id, COALESCE(o.table_code, r.table_code) AS table_code, o.customer_name, o.items_json, o.total, o.status, o.created_at
        FROM orders o
        LEFT JOIN reservations r ON r.id = o.reservation_id
        ORDER BY o.created_at DESC
    ')->fetchAll());
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
        'sessionExpiresAt' => $row['session_expires_at'] ? date(DATE_ATOM, strtotime((string) $row['session_expires_at'])) : null,
        'createdAt' => date(DATE_ATOM, strtotime((string) $row['created_at'])),
        'updatedAt' => date(DATE_ATOM, strtotime((string) $row['updated_at'])),
    ];
}

function map_order(array $row): array
{
    return [
        'id' => $row['id'],
        'reservationId' => $row['reservation_id'],
        'tableCode' => $row['table_code'],
        'customerName' => $row['customer_name'] ?? '',
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
    $sessionRows = $pdo->query('SELECT id, session_token_hash, session_expires_at FROM reservations')->fetchAll();
    $sessionsByReservation = [];
    foreach ($sessionRows as $row) {
        $sessionsByReservation[$row['id']] = $row;
    }

    $pdo->exec('DELETE FROM orders');
    $pdo->exec('DELETE FROM reservations');
    $statement = $pdo->prepare('
        INSERT INTO reservations (id, user_id, table_code, persons, date, time, status, session_token_hash, session_expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    foreach ($reservations as $reservation) {
        $session = $sessionsByReservation[$reservation['id']] ?? [];
        $statement->execute([
            $reservation['id'],
            upsert_user($pdo, $reservation),
            $reservation['tableCode'],
            (int) $reservation['persons'],
            $reservation['date'],
            $reservation['time'],
            $reservation['status'] ?? 'In attesa',
            $session['session_token_hash'] ?? null,
            $session['session_expires_at'] ?? null,
            date('Y-m-d H:i:s', strtotime($reservation['createdAt'] ?? 'now')),
            date('Y-m-d H:i:s', strtotime($reservation['updatedAt'] ?? 'now')),
        ]);
    }
}

function update_reservation_status(PDO $pdo, array $payload): array
{
    $id = trim((string) ($payload['id'] ?? ''));
    $status = (string) ($payload['status'] ?? '');
    if ($id === '' || !in_array($status, ['In attesa', 'Approvata', 'Rifiutata'], true)) {
        json_response(['error' => 'Stato prenotazione non valido'], 422);
    }

    $select = $pdo->prepare('
        SELECT r.*, u.nome, u.cognome, u.email, u.telefono
        FROM reservations r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.id = ?
        LIMIT 1
    ');
    $select->execute([$id]);
    $current = $select->fetch();
    if (!$current) {
        json_response(['error' => 'Prenotazione non trovata'], 404);
    }

    $statement = $pdo->prepare('UPDATE reservations SET status = ?, updated_at = NOW() WHERE id = ?');
    $statement->execute([$status, $id]);

    $select->execute([$id]);
    return map_reservation($select->fetch());
}

function replace_orders(PDO $pdo, array $orders): void
{
    $pdo->exec('DELETE FROM orders');
    $statement = $pdo->prepare('INSERT INTO orders (id, reservation_id, table_code, customer_name, items_json, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($orders as $order) {
        $statement->execute([
            $order['id'],
            $order['reservationId'] ?? null,
            $order['tableCode'] ?? null,
            $order['customerName'] ?? null,
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

function create_review(PDO $pdo, array $payload): array
{
    $review = [
        'id' => 'REV-' . strtoupper(base_convert((string) time(), 10, 36)) . '-' . strtoupper(bin2hex(random_bytes(3))),
        'customerName' => trim((string) ($payload['customerName'] ?? '')),
        'stars' => (int) ($payload['stars'] ?? 0),
        'comment' => trim((string) ($payload['comment'] ?? '')),
        'createdAt' => date(DATE_ATOM),
    ];

    if ($review['customerName'] === '' || strlen($review['customerName']) > 160) {
        json_response(['error' => 'Nome recensione non valido'], 422);
    }

    if ($review['stars'] < 1 || $review['stars'] > 5) {
        json_response(['error' => 'Valutazione non valida'], 422);
    }

    if ($review['comment'] === '' || strlen($review['comment']) > 1200) {
        json_response(['error' => 'Commento non valido'], 422);
    }

    $statement = $pdo->prepare('INSERT INTO reviews (id, customer_name, stars, comment, created_at) VALUES (?, ?, ?, ?, ?)');
    $statement->execute([
        $review['id'],
        $review['customerName'],
        $review['stars'],
        $review['comment'],
        date('Y-m-d H:i:s'),
    ]);

    return $review;
}

function request_payload(): array
{
    $raw = file_get_contents('php://input') ?: '{}';
    $payload = json_decode($raw, true);
    return is_array($payload) ? $payload : [];
}

function restaurant_timezone(): DateTimeZone
{
    return new DateTimeZone(RESTAURANT_TIMEZONE);
}

function restaurant_opening_windows(int $dayOfWeek): array
{
    return [
        ['18:00', '01:00'],
    ];
}

function parse_reservation_datetime(string $date, string $time): DateTimeImmutable
{
    $timezone = restaurant_timezone();
    $value = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $date . ' ' . $time, $timezone);
    $errors = DateTimeImmutable::getLastErrors();
    if (!$value || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
        json_response(['error' => 'Data o ora della prenotazione non valida'], 422);
    }
    if ($value->format('Y-m-d') !== $date || $value->format('H:i') !== $time) {
        json_response(['error' => 'Data o ora della prenotazione non valida'], 422);
    }
    return $value;
}

function validate_reservation_schedule(string $date, string $time): DateTimeImmutable
{
    $reservationAt = parse_reservation_datetime($date, $time);
    $timezone = restaurant_timezone();
    $now = new DateTimeImmutable('now', $timezone);
    $nowMinute = $now->setTime((int) $now->format('H'), (int) $now->format('i'));
    $maxDate = $nowMinute->modify('+' . RESERVATION_MAX_DAYS_AHEAD . ' days');

    if ($reservationAt < $nowMinute) {
        json_response(['error' => 'La prenotazione deve essere in un orario uguale o successivo a quello attuale'], 422);
    }

    if ($reservationAt > $maxDate) {
        json_response(['error' => 'La prenotazione non puo superare i ' . RESERVATION_MAX_DAYS_AHEAD . ' giorni di anticipo'], 422);
    }

    $durationEnd = $reservationAt->modify('+' . RESERVATION_DURATION_MINUTES . ' minutes');
    $dayOfWeek = (int) $reservationAt->format('N');
    foreach (restaurant_opening_windows($dayOfWeek) as [$open, $close]) {
        [$openHour, $openMinute] = array_map('intval', explode(':', $open));
        [$closeHour, $closeMinute] = array_map('intval', explode(':', $close));
        $windowStart = $reservationAt->setTime($openHour, $openMinute);
        $windowEnd = $reservationAt->setTime($closeHour, $closeMinute);
        if ($windowEnd <= $windowStart) {
            $windowEnd = $windowEnd->modify('+1 day');
        }
        if ($reservationAt >= $windowStart && $durationEnd <= $windowEnd) {
            return $reservationAt;
        }
    }

    json_response(['error' => 'Prenotazioni disponibili solo nella fascia 18:00-01:00; durata standard 2 ore'], 422);
}

function reservation_conflict_exists(PDO $pdo, string $tableCode, DateTimeImmutable $reservationAt): bool
{
    $statement = $pdo->prepare("
        SELECT time
        FROM reservations
        WHERE table_code = ?
          AND date = ?
          AND status IN ('In attesa', 'Approvata')
        FOR UPDATE
    ");
    $statement->execute([$tableCode, $reservationAt->format('Y-m-d')]);
    $requestedStart = $reservationAt->getTimestamp();
    $requestedEnd = $reservationAt->modify('+' . RESERVATION_DURATION_MINUTES . ' minutes')->getTimestamp();
    foreach ($statement->fetchAll() as $row) {
        $existingStart = parse_reservation_datetime($reservationAt->format('Y-m-d'), substr((string) $row['time'], 0, 5))->getTimestamp();
        $existingEnd = $existingStart + RESERVATION_DURATION_MINUTES * 60;
        if ($requestedStart < $existingEnd && $requestedEnd > $existingStart) {
            return true;
        }
    }
    return false;
}

function reservation_session_expires_at(string $date, string $time): DateTimeImmutable
{
    $reservationAt = parse_reservation_datetime($date, $time);
    $expiresAt = $reservationAt->modify('+' . TABLE_SESSION_DURATION_SECONDS . ' seconds');
    $minimumExpiry = (new DateTimeImmutable('now', restaurant_timezone()))->modify('+' . TABLE_SESSION_DURATION_SECONDS . ' seconds');
    return $expiresAt > $minimumExpiry ? $expiresAt : $minimumExpiry;
}

function set_table_session_cookie(string $token, DateTimeImmutable $expiresAt): void
{
    setcookie(TABLE_SESSION_COOKIE, $token, [
        'expires' => $expiresAt->getTimestamp(),
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function clear_table_session_cookie(): void
{
    setcookie(TABLE_SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function active_reservation_session(PDO $pdo): ?array
{
    $token = $_COOKIE[TABLE_SESSION_COOKIE] ?? '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
        return null;
    }

    $statement = $pdo->prepare("
        SELECT r.id, r.table_code, r.status, r.session_expires_at, t.capacity
        FROM reservations r
        INNER JOIN tables t ON t.code = r.table_code
        WHERE r.session_token_hash = ?
          AND r.session_expires_at > NOW()
          AND r.status IN ('In attesa', 'Approvata')
        LIMIT 1
    ");
    $statement->execute([hash('sha256', $token)]);
    $reservation = $statement->fetch();
    if (!$reservation) {
        clear_table_session_cookie();
        return null;
    }

    return [
        'reservationId' => $reservation['id'],
        'tableCode' => $reservation['table_code'],
        'status' => $reservation['status'],
        'canOrder' => $reservation['status'] === 'Approvata',
        'expiresAt' => date(DATE_ATOM, strtotime((string) $reservation['session_expires_at'])),
    ];
}

function create_reservation(PDO $pdo, array $payload): array
{
    $reservation = [
        'id' => 'RES-' . strtoupper(base_convert((string) time(), 10, 36)) . '-' . strtoupper(bin2hex(random_bytes(3))),
        'firstName' => trim((string) ($payload['firstName'] ?? '')),
        'lastName' => trim((string) ($payload['lastName'] ?? '')),
        'phone' => trim((string) ($payload['phone'] ?? '')),
        'email' => trim((string) ($payload['email'] ?? '')),
        'persons' => (int) ($payload['persons'] ?? 0),
        'date' => (string) ($payload['date'] ?? ''),
        'time' => (string) ($payload['time'] ?? ''),
        'tableCode' => (string) ($payload['tableCode'] ?? ''),
        'status' => 'In attesa',
        'createdAt' => date(DATE_ATOM),
        'updatedAt' => date(DATE_ATOM),
    ];

    if (!$reservation['firstName'] || !$reservation['lastName'] || !$reservation['phone'] || !$reservation['email']) {
        json_response(['error' => 'Dati prenotazione incompleti'], 422);
    }

    if (strlen($reservation['firstName']) > 80 || strlen($reservation['lastName']) > 80) {
        json_response(['error' => 'Nome e cognome non possono superare 80 caratteri'], 422);
    }

    if (!filter_var($reservation['email'], FILTER_VALIDATE_EMAIL) || strlen($reservation['email']) > 160) {
        json_response(['error' => 'Email non valida'], 422);
    }

    if (!preg_match('/^[0-9 +().-]{6,40}$/', $reservation['phone'])) {
        json_response(['error' => 'Telefono non valido'], 422);
    }

    if ($reservation['persons'] < 1 || !$reservation['date'] || !$reservation['time'] || !$reservation['tableCode']) {
        json_response(['error' => 'Tavolo, data, ora e numero persone sono obbligatori'], 422);
    }

    if ($reservation['persons'] > 12) {
        json_response(['error' => 'Numero persone non valido'], 422);
    }

    if (!preg_match('/^TABLE-HUB-\d{2}$/', $reservation['tableCode'])) {
        json_response(['error' => 'Codice tavolo non valido'], 422);
    }

    $reservationAt = validate_reservation_schedule($reservation['date'], $reservation['time']);
    $expiresAt = reservation_session_expires_at($reservation['date'], $reservation['time']);
    $token = bin2hex(random_bytes(32));
    $reservation['sessionExpiresAt'] = $expiresAt->format(DATE_ATOM);

    $pdo->beginTransaction();
    try {
        $table = $pdo->prepare('SELECT code, capacity, status FROM tables WHERE code = ? FOR UPDATE');
        $table->execute([$reservation['tableCode']]);
        $tableRow = $table->fetch();
        if (!$tableRow || (int) $tableRow['capacity'] < $reservation['persons'] || $tableRow['status'] === 'occupato') {
            $pdo->rollBack();
            json_response(['error' => 'Tavolo non valido per questa prenotazione'], 422);
        }

        if (reservation_conflict_exists($pdo, $reservation['tableCode'], $reservationAt)) {
            $pdo->rollBack();
            json_response(['error' => 'Il tavolo selezionato e gia prenotato in questa fascia oraria'], 409);
        }

        $statement = $pdo->prepare('
            INSERT INTO reservations (id, user_id, table_code, persons, date, time, status, session_token_hash, session_expires_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $statement->execute([
            $reservation['id'],
            upsert_user($pdo, $reservation),
            $reservation['tableCode'],
            $reservation['persons'],
            $reservation['date'],
            $reservation['time'],
            $reservation['status'],
            hash('sha256', $token),
            $expiresAt->format('Y-m-d H:i:s'),
            date('Y-m-d H:i:s'),
            date('Y-m-d H:i:s'),
        ]);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    set_table_session_cookie($token, $expiresAt);
    return $reservation;
}

function create_order_for_session(PDO $pdo, array $payload): array
{
    $session = active_reservation_session($pdo);
    if (!$session) {
        json_response(['error' => 'Prenotazione tavolo mancante o scaduta. Prenota un tavolo prima di ordinare.'], 403);
    }

    if (($session['status'] ?? '') !== 'Approvata') {
        json_response(['error' => 'La prenotazione deve essere approvata dall admin prima di ordinare.'], 403);
    }

    $items = $payload['items'] ?? [];
    if (!is_array($items) || count($items) === 0) {
        json_response(['error' => 'Seleziona almeno un piatto'], 422);
    }

    if (count($items) > 20) {
        json_response(['error' => 'Ordine troppo grande'], 422);
    }

    $ids = array_values(array_unique(array_filter(array_map(static fn ($item) => (string) ($item['id'] ?? ''), $items))));
    if (!$ids) {
        json_response(['error' => 'Ordine non valido'], 422);
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $menuStatement = $pdo->prepare("SELECT id, name, price FROM menu WHERE available = 1 AND id IN ($placeholders)");
    $menuStatement->execute($ids);
    $menuById = [];
    foreach ($menuStatement->fetchAll() as $menuItem) {
        $menuById[$menuItem['id']] = $menuItem;
    }

    $normalizedItems = [];
    foreach ($items as $item) {
        $id = (string) ($item['id'] ?? '');
        $quantity = (int) ($item['quantity'] ?? 0);
        if ($quantity <= 0 || $quantity > 10 || !isset($menuById[$id])) {
            continue;
        }
        $normalizedItems[] = [
            'id' => $id,
            'name' => $menuById[$id]['name'],
            'price' => (float) $menuById[$id]['price'],
            'quantity' => $quantity,
        ];
    }

    if (!$normalizedItems) {
        json_response(['error' => 'Nessun piatto disponibile nell ordine'], 422);
    }

    $totalQuantity = array_reduce($normalizedItems, static fn ($sum, $item) => $sum + (int) $item['quantity'], 0);
    if ($totalQuantity > 30) {
        json_response(['error' => 'Quantita totale ordine troppo alta'], 422);
    }

    $total = array_reduce($normalizedItems, static fn ($sum, $item) => $sum + $item['price'] * $item['quantity'], 0.0);
    $order = [
        'id' => 'ORD-' . strtoupper(base_convert((string) time(), 10, 36)) . '-' . strtoupper(bin2hex(random_bytes(3))),
        'reservationId' => $session['reservationId'],
        'tableCode' => $session['tableCode'],
        'customerName' => '',
        'items' => $normalizedItems,
        'total' => $total,
        'status' => 'Ricevuto',
        'createdAt' => date(DATE_ATOM),
    ];

    $statement = $pdo->prepare('
        INSERT INTO orders (id, reservation_id, table_code, customer_name, items_json, total, status, created_at)
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
    ');
    $statement->execute([
        $order['id'],
        $order['reservationId'],
        $order['tableCode'],
        json_encode($order['items'], JSON_UNESCAPED_UNICODE),
        $order['total'],
        $order['status'],
        date('Y-m-d H:i:s'),
    ]);

    return $order;
}
