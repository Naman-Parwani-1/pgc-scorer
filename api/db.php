<?php
// PDO connection + schema. Tables are created on demand so there is no
// separate migration step: the first call that needs them makes them.

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

function pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $cfg = config();
    $host = $cfg['db_host'] ?? 'localhost';
    $name = $cfg['db_name'];
    $user = $cfg['db_user'] ?? '';
    $pass = $cfg['db_pass'] ?? '';
    $port = $cfg['db_port'] ?? 3306;
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        fail('Database connection failed. Check the credentials in config.php.', 500);
    }
    return $pdo;
}

function ensure_schema(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(40) PRIMARY KEY,
            username VARCHAR(64) UNIQUE NOT NULL,
            display_name VARCHAR(128) NOT NULL,
            phone VARCHAR(32) NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(16) NOT NULL DEFAULT "member",
            created_at BIGINT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS sessions (
            token VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(40) NOT NULL,
            created_at BIGINT NOT NULL,
            expires_at BIGINT NOT NULL,
            INDEX idx_sess_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS records (
            collection VARCHAR(40) NOT NULL,
            doc_id VARCHAR(160) NOT NULL,
            data MEDIUMTEXT NOT NULL,
            updated_at BIGINT NOT NULL,
            deleted TINYINT NOT NULL DEFAULT 0,
            updated_by VARCHAR(40) NULL,
            PRIMARY KEY (collection, doc_id),
            INDEX idx_rec_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $done = true;
}

// Resolve the caller's session token to a user row, or 401.
function require_user(PDO $pdo): array
{
    ensure_schema($pdo);
    $token = bearer_token();
    if (!$token) {
        fail('Not signed in.', 401);
    }
    $stmt = $pdo->prepare(
        'SELECT u.id, u.username, u.display_name, u.phone, u.role, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ?'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) {
        fail('Session invalid. Please sign in again.', 401);
    }
    if ((int) $row['expires_at'] < now_ms()) {
        $del = $pdo->prepare('DELETE FROM sessions WHERE token = ?');
        $del->execute([$token]);
        fail('Session expired. Please sign in again.', 401);
    }
    return $row;
}
