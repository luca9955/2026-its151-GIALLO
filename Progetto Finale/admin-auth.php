<?php
declare(strict_types=1);

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '$2y$10$VrLGNR7JKPTLnrr.lezjpetdlKSzRkeruyCa7RVXTfqt150UxUymW';
const ADMIN_MAX_ATTEMPTS = 5;
const ADMIN_LOCK_SECONDS = 20;

function admin_start_session(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        ini_set('session.use_strict_mode', '1');
        $sessionPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ficsit-admin-sessions';
        if (!is_dir($sessionPath)) {
            mkdir($sessionPath, 0700, true);
        }
        session_save_path($sessionPath);
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function admin_is_logged_in(): bool
{
    admin_start_session();
    return !empty($_SESSION['admin_logged_in']);
}

function admin_require_login(): void
{
    if (!admin_is_logged_in()) {
        header('Location: admin-login.php');
        exit;
    }
}

function admin_csrf_token(): string
{
    admin_start_session();
    if (empty($_SESSION['admin_csrf'])) {
        $_SESSION['admin_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['admin_csrf'];
}

function admin_verify_csrf(?string $token): bool
{
    admin_start_session();
    return is_string($token)
        && isset($_SESSION['admin_csrf'])
        && hash_equals($_SESSION['admin_csrf'], $token);
}

function admin_is_locked(): bool
{
    admin_start_session();
    return isset($_SESSION['admin_locked_until']) && time() < (int) $_SESSION['admin_locked_until'];
}

function admin_register_failed_login(): void
{
    admin_start_session();
    $_SESSION['admin_login_attempts'] = (int) ($_SESSION['admin_login_attempts'] ?? 0) + 1;
    if ($_SESSION['admin_login_attempts'] >= ADMIN_MAX_ATTEMPTS) {
        $_SESSION['admin_locked_until'] = time() + ADMIN_LOCK_SECONDS;
        $_SESSION['admin_login_attempts'] = 0;
    }
}

function admin_verify_credentials(string $username, string $password): bool
{
    return hash_equals(ADMIN_USERNAME, $username)
        && password_verify($password, ADMIN_PASSWORD_HASH);
}

function admin_login(string $username): void
{
    admin_start_session();
    session_regenerate_id(true);
    $_SESSION['admin_logged_in'] = true;
    $_SESSION['admin_user'] = $username;
    unset($_SESSION['admin_login_attempts'], $_SESSION['admin_locked_until']);
}

function admin_logout(): void
{
    admin_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
}
