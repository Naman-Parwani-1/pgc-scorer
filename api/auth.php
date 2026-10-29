<?php
// Account + session endpoints.
//   POST auth.php?action=register  {username, password, displayName, phone?, signupCode?}
//   POST auth.php?action=login     {username, password}
//   POST auth.php?action=logout
//   GET  auth.php?action=me

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$cfg = config();
$pdo = pdo();
ensure_schema($pdo);

$action = $_GET['action'] ?? '';
$SESSION_DAYS = 60;

switch ($action) {
    case 'register': {
        $in = body();
        $username = strtolower(trim((string) ($in['username'] ?? '')));
        $password = (string) ($in['password'] ?? '');
        $display  = trim((string) ($in['displayName'] ?? ''));
        $phone    = trim((string) ($in['phone'] ?? ''));
        $code     = (string) ($in['signupCode'] ?? '');

        if (!preg_match('/^[a-z0-9._]{3,64}$/', $username)) {
            fail('Username must be 3-64 characters: letters, numbers, dot or underscore.');
        }
        if (strlen($password) < 6) {
            fail('Password must be at least 6 characters.');
        }
        if ($display === '') {
            $display = $username;
        }
        $required = (string) ($cfg['signup_code'] ?? '');
        if ($required !== '' && !hash_equals($required, $code)) {
            fail('Wrong signup code. Ask the organiser for the code.', 403);
        }

        $exists = $pdo->prepare('SELECT 1 FROM users WHERE username = ?');
        $exists->execute([$username]);
        if ($exists->fetch()) {
            fail('That username is taken. Pick another.', 409);
        }

        $id = new_id();
        // First user ever becomes admin.
        $count = (int) $pdo->query('SELECT COUNT(*) AS c FROM users')->fetch()['c'];
        $role = $count === 0 ? 'admin' : 'member';

        $ins = $pdo->prepare(
            'INSERT INTO users (id, username, display_name, phone, password_hash, role, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $id, $username, $display, $phone !== '' ? $phone : null,
            password_hash($password, PASSWORD_DEFAULT), $role, now_ms(),
        ]);

        $token = issue_session($pdo, $id, $SESSION_DAYS);
        send([
            'ok' => true,
            'token' => $token,
            'user' => ['id' => $id, 'username' => $username, 'displayName' => $display, 'phone' => $phone, 'role' => $role],
        ]);
    }

    case 'login': {
        $in = body();
        $username = strtolower(trim((string) ($in['username'] ?? '')));
        $password = (string) ($in['password'] ?? '');
        if ($username === '' || $password === '') {
            fail('Enter your username and password.');
        }
        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $u = $stmt->fetch();
        if (!$u || !password_verify($password, $u['password_hash'])) {
            fail('Wrong username or password.', 401);
        }
        $token = issue_session($pdo, $u['id'], $SESSION_DAYS);
        send([
            'ok' => true,
            'token' => $token,
            'user' => ['id' => $u['id'], 'username' => $u['username'], 'displayName' => $u['display_name'], 'phone' => $u['phone'], 'role' => $u['role']],
        ]);
    }

    case 'logout': {
        $token = bearer_token();
        if ($token) {
            $del = $pdo->prepare('DELETE FROM sessions WHERE token = ?');
            $del->execute([$token]);
        }
        send(['ok' => true]);
    }

    case 'me': {
        $u = require_user($pdo);
        send([
            'ok' => true,
            'user' => ['id' => $u['id'], 'username' => $u['username'], 'displayName' => $u['display_name'], 'phone' => $u['phone'], 'role' => $u['role']],
        ]);
    }

    default:
        fail('Unknown action.', 404);
}

function issue_session(PDO $pdo, string $userId, int $days): string
{
    $token = bin2hex(random_bytes(32));
    $created = now_ms();
    $expires = $created + $days * 86400 * 1000;
    $ins = $pdo->prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
    $ins->execute([$token, $userId, $created, $expires]);
    // Opportunistic cleanup of expired sessions.
    $pdo->prepare('DELETE FROM sessions WHERE expires_at < ?')->execute([$created]);
    return $token;
}
