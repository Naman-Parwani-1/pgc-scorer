<?php
// Health check: GET api/ -> { ok, installed }
declare(strict_types=1);
require_once __DIR__ . '/lib.php';
send(['ok' => true, 'service' => 'ads-falcons-scorer', 'installed' => is_file(__DIR__ . '/config.php')]);
