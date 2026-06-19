<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $database = read_database(db());
    $today = date('Y-m-d');
    $dailyRevenue = 0;

    foreach ($database['orders'] as $order) {
        if (substr($order['createdAt'], 0, 10) === $today) {
            $dailyRevenue += (float) ($order['total'] ?? 0);
        }
    }

    json_response([
        'reservationsToday' => count(array_filter($database['reservations'], fn ($item) => $item['date'] === $today)),
        'activeOrders' => count(array_filter($database['orders'], fn ($item) => $item['status'] !== 'Consegnato')),
        'reviewCount' => count($database['reviews']),
        'dailyRevenue' => $dailyRevenue,
        'menuItems' => count($database['menu']),
        'pendingReservations' => count(array_filter($database['reservations'], fn ($item) => $item['status'] === 'In attesa')),
    ]);
} catch (Throwable $error) {
    fail($error);
}
