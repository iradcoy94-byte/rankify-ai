<?php

declare(strict_types=1);

$config = [
    'app_name' => 'Rankify.AI',
    'frontend_origin' => getenv('RANKIFY_FRONTEND_ORIGIN') ?: 'http://localhost:8080',
    'db' => [
        'host' => getenv('RANKIFY_DB_HOST') ?: '127.0.0.1',
        'port' => getenv('RANKIFY_DB_PORT') ?: '3306',
        'name' => getenv('RANKIFY_DB_NAME') ?: 'rankify_ai',
        'user' => getenv('RANKIFY_DB_USER') ?: 'root',
        'pass' => getenv('RANKIFY_DB_PASS') ?: '',
    ],
    'deepseek' => [
        'api_key' => getenv('DEEPSEEK_API_KEY') ?: '',
        'base_url' => getenv('DEEPSEEK_BASE_URL') ?: 'https://api.deepseek.com/chat/completions',
        'model' => getenv('DEEPSEEK_MODEL') ?: 'deepseek-chat',
    ],
];

$local = __DIR__ . '/config.local.php';
if (is_file($local)) {
    $override = require $local;
    if (is_array($override)) {
        $config = array_replace_recursive($config, $override);
    }
}

return $config;
