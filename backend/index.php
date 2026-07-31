<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

header('Access-Control-Allow-Origin: ' . $config['frontend_origin']);
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(['error' => 'Body JSON tidak valid.'], 400);
    }

    return $data;
}

function db(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = $config['db'];
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $db['host'],
        $db['port'],
        $db['name'],
    );

    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
        return trim($matches[1]);
    }

    return null;
}

function current_user(array $config): array
{
    $token = bearer_token();
    if (!$token) {
        json_response(['error' => 'Token login diperlukan.'], 401);
    }

    $stmt = db($config)->prepare(
        'SELECT s.token, s.expires_at, u.id, u.name, u.email, u.role
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > NOW()
         LIMIT 1',
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        json_response(['error' => 'Sesi tidak valid atau sudah kedaluwarsa.'], 401);
    }

    return $user;
}

function require_teacher(array $user): void
{
    if (($user['role'] ?? '') !== 'guru') {
        json_response(['error' => 'Akses hanya untuk guru.'], 403);
    }
}

function normalize_student(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'score' => is_null($row['score']) ? null : (float) $row['score'],
        'className' => $row['class_name'],
        'meeting' => is_null($row['meeting']) ? null : (int) $row['meeting'],
        'model' => $row['model'],
        'pretest' => is_null($row['pretest']) ? null : (float) $row['pretest'],
        'posttest' => is_null($row['posttest']) ? null : (float) $row['posttest'],
        'kind' => $row['kind'],
        'rank' => 0,
        'isValid' => true,
    ];
}

function student_payload(array $body): array
{
    $score = array_key_exists('score', $body) && is_numeric($body['score']) ? (float) $body['score'] : null;

    return [
        'id' => isset($body['id']) && trim((string) $body['id']) !== ''
            ? trim((string) $body['id'])
            : bin2hex(random_bytes(16)),
        'name' => trim((string) ($body['name'] ?? '')),
        'score' => $score,
        'class_name' => isset($body['className']) ? trim((string) $body['className']) : null,
        'meeting' => isset($body['meeting']) && is_numeric($body['meeting']) ? max(1, (int) $body['meeting']) : null,
        'model' => isset($body['model']) ? trim((string) $body['model']) : null,
        'pretest' => isset($body['pretest']) && is_numeric($body['pretest']) ? (float) $body['pretest'] : null,
        'posttest' => isset($body['posttest']) && is_numeric($body['posttest']) ? (float) $body['posttest'] : null,
        'kind' => isset($body['kind']) ? trim((string) $body['kind']) : null,
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/', '/');
$scriptDir = trim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($scriptDir !== '' && str_starts_with($path, $scriptDir)) {
    $path = trim(substr($path, strlen($scriptDir)), '/');
}
$segments = $path === '' ? [] : explode('/', $path);

try {
    if ($segments === ['health']) {
        json_response(['ok' => true, 'app' => $config['app_name']]);
    }

    if ($segments === ['auth', 'login'] && $method === 'POST') {
        $body = read_json();
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        $stmt = db($config)->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !hash_equals((string) $user['password_hash'], hash('sha256', $password))) {
            json_response(['error' => 'Email atau password salah.'], 401);
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = (new DateTimeImmutable('+8 hours'))->format('Y-m-d H:i:s');
        $insert = db($config)->prepare(
            'INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
        );
        $insert->execute([$token, $user['id'], $expiresAt]);

        json_response([
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
        ]);
    }

    if ($segments === ['auth', 'me'] && $method === 'GET') {
        $user = current_user($config);
        json_response([
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
        ]);
    }

    if ($segments === ['auth', 'logout'] && $method === 'POST') {
        $token = bearer_token();
        if ($token) {
            $stmt = db($config)->prepare('DELETE FROM auth_sessions WHERE token = ?');
            $stmt->execute([$token]);
        }
        json_response(['ok' => true]);
    }

    if (($segments[0] ?? '') === 'students') {
        $user = current_user($config);

        if (count($segments) === 1 && $method === 'GET') {
            $rows = db($config)
                ->query('SELECT * FROM students ORDER BY created_at ASC, name ASC')
                ->fetchAll();
            json_response(['students' => array_map('normalize_student', $rows)]);
        }

        if (count($segments) === 1 && $method === 'POST') {
            require_teacher($user);
            $body = read_json();
            $rows = isset($body['students']) && is_array($body['students']) ? $body['students'] : [$body];
            $pdo = db($config);
            $pdo->beginTransaction();
            $stmt = $pdo->prepare(
                'INSERT INTO students (id, name, score, class_name, meeting, model, pretest, posttest, kind)
                 VALUES (:id, :name, :score, :class_name, :meeting, :model, :pretest, :posttest, :kind)
                 ON DUPLICATE KEY UPDATE
                 name = VALUES(name), score = VALUES(score), class_name = VALUES(class_name),
                 meeting = VALUES(meeting), model = VALUES(model), pretest = VALUES(pretest),
                 posttest = VALUES(posttest), kind = VALUES(kind)',
            );
            foreach ($rows as $row) {
                $stmt->execute(student_payload($row));
            }
            $pdo->commit();
            json_response(['ok' => true]);
        }

        if (count($segments) === 2 && $method === 'PATCH') {
            require_teacher($user);
            $payload = student_payload(['id' => $segments[1], ...read_json()]);
            $stmt = db($config)->prepare(
                'UPDATE students
                 SET name = :name, score = :score, class_name = :class_name, meeting = :meeting,
                     model = :model, pretest = :pretest, posttest = :posttest, kind = :kind
                 WHERE id = :id',
            );
            $stmt->execute($payload);
            json_response(['ok' => true]);
        }

        if (count($segments) === 2 && $method === 'DELETE') {
            require_teacher($user);
            $stmt = db($config)->prepare('DELETE FROM students WHERE id = ?');
            $stmt->execute([$segments[1]]);
            json_response(['ok' => true]);
        }

        if (count($segments) === 1 && $method === 'DELETE') {
            require_teacher($user);
            db($config)->exec('DELETE FROM students');
            json_response(['ok' => true]);
        }
    }

    if ($segments === ['chat'] && $method === 'POST') {
        $user = current_user($config);
        $body = read_json();
        $aiConfig = $config['openrouter'];
        $apiKey = $aiConfig['api_key'];

        if (!$apiKey) {
            json_response(['error' => 'OPENROUTER_API_KEY belum diatur di environment XAMPP atau backend/config.local.php.'], 500);
        }

        $students = $body['students'] ?? [];
        $messages = $body['messages'] ?? [];
        $system = [
            'role' => 'system',
            'content' => 'Anda adalah AI Assistant Rankify.AI untuk konteks pendidikan. Jawab dalam Bahasa Indonesia, ringkas, membantu peserta didik memahami materi, membaca gambar soal jika dilampirkan, dan membantu guru membaca data nilai. Gunakan data siswa yang diberikan hanya sebagai konteks, jangan mengarang data.',
        ];
        $context = [
            'role' => 'system',
            'content' => 'Role pengguna: ' . $user['role'] . '. Data siswa JSON: ' . json_encode($students, JSON_UNESCAPED_UNICODE),
        ];

        $payload = [
            'model' => $aiConfig['model'],
            'stream' => true,
            'messages' => array_merge([$system, $context], $messages),
        ];

        header('Content-Type: text/event-stream; charset=utf-8');
        header('Cache-Control: no-cache');
        header('X-Accel-Buffering: no');

        $ch = curl_init($aiConfig['base_url']);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
                'HTTP-Referer: ' . $aiConfig['referer'],
                'X-Title: ' . $aiConfig['title'],
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_WRITEFUNCTION => static function ($curl, string $chunk): int {
                echo $chunk;
                @ob_flush();
                flush();
                return strlen($chunk);
            },
        ]);

        curl_exec($ch);
        if (curl_errno($ch)) {
            echo "data: " . json_encode(['error' => curl_error($ch)]) . "\n\n";
        }
        curl_close($ch);
        exit;
    }

    json_response(['error' => 'Endpoint tidak ditemukan.'], 404);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_response(['error' => $e->getMessage()], 500);
}
