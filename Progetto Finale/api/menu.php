<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        json_response(read_database($pdo)['menu']);
    }

    if ($method === 'PUT' || $method === 'POST') {
        replace_menu($pdo, request_payload());
        json_response(['ok' => true]);
    }

    json_response(['error' => 'Metodo non supportato'], 405);
} catch (Throwable $error) {
    fail($error);
}
