<?php
// Shared helpers for the ADS Falcons Scorer API.
// No framework — plain PHP so it runs on any shared cPanel host.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// Token auth only (Authorization: Bearer ...), never cookies, so a wildcard
// CORS origin is safe and lets the app be served from any subdomain/host.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Max-Age: 86400');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function send($data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $code = 400, array $extra = []): void
{
    send(array_merge(['ok' => false, 'error' => $message], $extra), $code);
}

function body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $parsed = json_decode($raw, true);
    return is_array($parsed) ? $parsed : [];
}

function now_ms(): int
{
    return (int) round(microtime(true) * 1000);
}

function new_id(): string
{
    return bin2hex(random_bytes(16));
}

function bearer_token(): ?string
{
    $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($hdr === '' && function_exists('apache_request_headers')) {
        $all = apache_request_headers();
        foreach ($all as $k => $v) {
            if (strcasecmp($k, 'Authorization') === 0) {
                $hdr = $v;
                break;
            }
        }
    }
    if (preg_match('/Bearer\s+(.+)/i', $hdr, $m)) {
        return trim($m[1]);
    }
    return null;
}

// Load config.php (written by install.php). If missing, the API is not set up.
function config(): array
{
    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        fail('Not installed yet. Open install.php in your browser to set up the database.', 503, ['needsInstall' => true]);
    }
    $cfg = require $path;
    if (!is_array($cfg) || empty($cfg['db_name'])) {
        fail('Config is present but incomplete. Re-run install.php.', 503, ['needsInstall' => true]);
    }
    return $cfg;
}
