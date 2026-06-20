<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-auth.php';

admin_start_session();

if (admin_is_logged_in()) {
    header('Location: principale.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');
    $csrf = (string) ($_POST['csrf'] ?? '');

    if (!admin_verify_csrf($csrf)) {
        $error = 'Sessione scaduta. Riprova.';
    } elseif (admin_is_locked()) {
        $error = 'Troppi tentativi. Attendi qualche secondo e riprova.';
    } elseif (admin_verify_credentials($username, $password)) {
        admin_login($username);
        header('Location: principale.php');
        exit;
    } else {
        admin_register_failed_login();
        $error = 'Credenziali non valide.';
    }
}

$token = admin_csrf_token();
?>
<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Login area admin FICSIT Restaurant OS.">
    <meta name="theme-color" content="#ff6a00">
    <title>Login Admin | FICSIT Restaurant OS</title>
    <link rel="stylesheet" href="assets/css/styles.css">
    <link rel="stylesheet" href="principale.css">
  </head>
  <body data-page="admin-login">
    <main class="admin-login-shell">
      <section class="admin-login-card" aria-labelledby="admin-login-title">
        <a class="brand" href="home.html">
          <span class="brand__mark">F</span>
          <span>FICSIT ADMIN<span class="brand__sub">Access terminal</span></span>
        </a>
        <div>
          <p class="eyebrow">Area riservata</p>
          <h1 id="admin-login-title">Accesso Admin</h1>
          <p class="admin-login-copy">Inserisci le credenziali abilitate per aprire la console di gestione.</p>
        </div>
        <?php if ($error !== ''): ?>
          <p class="admin-login-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
        <?php endif; ?>
        <form class="admin-login-form" method="post" action="admin-login.php">
          <input type="hidden" name="csrf" value="<?= htmlspecialchars($token, ENT_QUOTES, 'UTF-8') ?>">
          <div class="field">
            <label for="username">Utente</label>
            <input id="username" name="username" autocomplete="username" required autofocus>
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required>
          </div>
          <button class="button button--solid" type="submit">Accedi</button>
        </form>
        <a class="admin-login-home" href="home.html">Torna al sito cliente</a>
      </section>
    </main>
  </body>
</html>
