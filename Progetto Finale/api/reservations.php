<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../admin-auth.php';

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $reservations = read_database($pdo)['reservations'];
        if (admin_is_logged_in()) {
            json_response($reservations);
        }
        json_response(array_map(static fn ($reservation) => [
            'id' => $reservation['id'],
            'tableCode' => $reservation['tableCode'],
            'persons' => $reservation['persons'],
            'date' => $reservation['date'],
            'time' => $reservation['time'],
            'status' => $reservation['status'],
        ], $reservations));
    }

    if ($method === 'POST') {
        json_response(create_reservation($pdo, request_payload()), 201);
    }

    if ($method === 'PATCH') {
        if (!admin_is_logged_in()) {
            json_response(['error' => 'Accesso non autorizzato'], 403);
        }
        if (!admin_verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
            json_response(['error' => 'Token CSRF non valido'], 403);
        }
        json_response(update_reservation_status($pdo, request_payload()));
    }

    if ($method === 'PUT') {
        if (!admin_is_logged_in()) {
            json_response(['error' => 'Accesso non autorizzato'], 403);
        }
        if (!admin_verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
            json_response(['error' => 'Token CSRF non valido'], 403);
        }
        replace_reservations($pdo, request_payload());
        json_response(['ok' => true]);
    }

    json_response(['error' => 'Metodo non supportato'], 405);
} catch (Throwable $error) {
    fail($error);
}
