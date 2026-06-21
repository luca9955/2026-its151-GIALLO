<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        json_response(read_database($pdo)['orders']);
    }

    if ($method === 'POST') {
        json_response(create_order_for_session($pdo, request_payload()), 201);
    }

    if ($method === 'PUT') {
        replace_orders($pdo, request_payload());
        json_response(['ok' => true]);
    }

    json_response(['error' => 'Metodo non supportato'], 405);
} catch (Throwable $error) {
    fail($error);
}
