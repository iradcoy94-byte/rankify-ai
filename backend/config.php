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
    'openrouter' => [
        'api_key' => getenv('OPENROUTER_API_KEY') ?: getenv('DEEPSEEK_API_KEY') ?: '',
        'base_url' => getenv('OPENROUTER_BASE_URL') ?: 'https://openrouter.ai/api/v1/chat/completions',
        'model' => getenv('OPENROUTER_MODEL') ?: 'openai/gpt-4o',
        'referer' => getenv('OPENROUTER_HTTP_REFERER') ?: 'http://localhost:8080',
        'title' => getenv('OPENROUTER_X_TITLE') ?: 'Rankify.AI',
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
