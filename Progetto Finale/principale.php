<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-auth.php';
admin_require_login();
$adminUser = $_SESSION['admin_user'] ?? ADMIN_USERNAME;
?>
<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Area admin FICSIT Restaurant OS con dashboard, menu, prenotazioni, ordini e recensioni sincronizzati.">
    <meta name="theme-color" content="#ff6a00">
    <title>Admin | FICSIT Restaurant OS</title>
    <link rel="stylesheet" href="assets/css/styles.css">
    <link rel="stylesheet" href="principale.css">
  </head>
  <body data-page="admin">
    <div class="admin-shell">
      <aside class="admin-sidebar" aria-label="Menu admin">
        <a class="brand" href="home.html">
          <span class="brand__mark">F</span>
          <span>FICSIT ADMIN<span class="brand__sub">Control terminal</span></span>
        </a>
        <nav class="admin-nav">
          <button class="admin-nav__button is-active" type="button" data-view="dashboard">Dashboard</button>
          <button class="admin-nav__button" type="button" data-view="menu">Gestione Menu</button>
          <button class="admin-nav__button" type="button" data-view="reservations">Prenotazioni</button>
          <button class="admin-nav__button" type="button" data-view="orders">Ordinazioni</button>
          <button class="admin-nav__button" type="button" data-view="reviews">Recensioni</button>
          <a class="admin-nav__button" href="admin-logout.php">Logout</a>
        </nav>
      </aside>

      <main class="admin-main">
        <header class="admin-header">
          <div>
            <p class="eyebrow">Operations control</p>
            <h1>Console Admin</h1>
          </div>
          <span class="admin-status">ADMIN <?= htmlspecialchars((string) $adminUser, ENT_QUOTES, 'UTF-8') ?></span>
        </header>

        <iframe id="adminFrame" class="admin-frame" title="Dashboard operativa FICSIT"></iframe>
      </main>
    </div>
    <script type="module" src="principale.js"></script>
  </body>
</html>
