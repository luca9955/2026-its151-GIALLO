<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../admin-auth.php';

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        if (!admin_is_logged_in()) {
            json_response(['error' => 'Accesso non autorizzato'], 403);
        }
        json_response(read_database($pdo)['orders']);
    }

    if ($method === 'POST') {
        json_response(create_order_for_session($pdo, request_payload()), 201);
    }

    if ($method === 'PUT') {
        if (!admin_is_logged_in()) {
            json_response(['error' => 'Accesso non autorizzato'], 403);
        }
        if (!admin_verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
            json_response(['error' => 'Token CSRF non valido'], 403);
        }
        replace_orders($pdo, request_payload());
        json_response(['ok' => true]);
    }

    json_response(['error' => 'Metodo non supportato'], 405);
} catch (Throwable $error) {
    fail($error);
}
