<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../admin-auth.php';

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        json_response(read_database($pdo)['menu']);
    }

    if ($method === 'PUT' || $method === 'POST') {
        if (!admin_is_logged_in()) {
            json_response(['error' => 'Accesso non autorizzato'], 403);
        }
        if (!admin_verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
            json_response(['error' => 'Token CSRF non valido'], 403);
        }
        replace_menu($pdo, request_payload());
        json_response(['ok' => true]);
    }

    json_response(['error' => 'Metodo non supportato'], 405);
} catch (Throwable $error) {
    fail($error);
}
