<?php
// Shared-database sync. Every signed-in device reads and writes the same rows.
//
//   GET  sync.php?since=<ms>   -> { records:[...], serverTime }  (changes since <ms>)
//   POST sync.php  { records:[{collection, docId, data, updatedAt, deleted}] }
//                             -> { applied, serverTime }
//
// Conflict rule: last write wins per record, by updatedAt. A push only
// overwrites a row when its updatedAt is newer than what the server holds,
// so a stale device can never clobber a fresher score.

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = pdo();
$user = require_user($pdo);

$COLLECTIONS = ['courses', 'players', 'events', 'groups', 'teams', 'cards', 'audit', 'history'];

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $since = (int) ($_GET['since'] ?? 0);
    $stmt = $pdo->prepare(
        'SELECT collection, doc_id, data, updated_at, deleted
         FROM records WHERE updated_at > ? ORDER BY updated_at ASC'
    );
    $stmt->execute([$since]);
    $out = [];
    foreach ($stmt as $r) {
        $out[] = [
            'collection' => $r['collection'],
            'docId' => $r['doc_id'],
            'data' => json_decode($r['data'], true),
            'updatedAt' => (int) $r['updated_at'],
            'deleted' => ((int) $r['deleted']) === 1,
        ];
    }
    send(['ok' => true, 'records' => $out, 'serverTime' => now_ms()]);
}

if ($method === 'POST') {
    $in = body();
    $records = $in['records'] ?? [];
    if (!is_array($records)) {
        fail('records must be an array.');
    }

    $upsert = $pdo->prepare(
        'INSERT INTO records (collection, doc_id, data, updated_at, deleted, updated_by)
         VALUES (:c, :d, :data, :ts, :del, :by)
         ON DUPLICATE KEY UPDATE
            data = IF(VALUES(updated_at) > updated_at, VALUES(data), data),
            deleted = IF(VALUES(updated_at) > updated_at, VALUES(deleted), deleted),
            updated_by = IF(VALUES(updated_at) > updated_at, VALUES(updated_by), updated_by),
            updated_at = IF(VALUES(updated_at) > updated_at, VALUES(updated_at), updated_at)'
    );

    $applied = 0;
    $pdo->beginTransaction();
    try {
        foreach ($records as $rec) {
            $collection = (string) ($rec['collection'] ?? '');
            $docId = (string) ($rec['docId'] ?? '');
            if (!in_array($collection, $COLLECTIONS, true) || $docId === '') {
                continue;
            }
            $updatedAt = (int) ($rec['updatedAt'] ?? now_ms());
            $deleted = !empty($rec['deleted']) ? 1 : 0;
            $data = json_encode($rec['data'] ?? null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (strlen($docId) > 160) {
                continue;
            }
            $upsert->execute([
                ':c' => $collection, ':d' => $docId, ':data' => $data,
                ':ts' => $updatedAt, ':del' => $deleted, ':by' => $user['id'],
            ]);
            $applied++;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        fail('Sync write failed.', 500);
    }

    send(['ok' => true, 'applied' => $applied, 'serverTime' => now_ms()]);
}

fail('Method not allowed.', 405);
