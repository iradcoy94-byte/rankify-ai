<?php

declare(strict_types=1);

return [
    'frontend_origin' => 'http://localhost:8080',
    'db' => [
        'host' => '127.0.0.1',
        'port' => '3306',
        'name' => 'rankify_ai',
        'user' => 'root',
        'pass' => '',
    ],
    'deepseek' => [
        'api_key' => 'ISI_API_KEY_DEEPSEEK_DI_SINI',
        'base_url' => 'https://api.deepseek.com/chat/completions',
        'model' => 'deepseek-chat',
    ],
];
