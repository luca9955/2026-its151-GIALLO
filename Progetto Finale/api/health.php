<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    db();
    json_response(['ok' => true]);
} catch (Throwable $error) {
    fail($error);
}
