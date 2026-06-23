<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $session = active_reservation_session($pdo);
        if (!$session) {
            json_response(['active' => false], 401);
        }
        json_response(array_merge(['active' => true], $session));
    }

    if ($method === 'DELETE' || $method === 'POST') {
        json_response(close_table_session($pdo));
    }

    json_response(['error' => 'Metodo non supportato'], 405);
} catch (Throwable $error) {
    fail($error);
}
