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
    'openrouter' => [
        'api_key' => 'ISI_API_KEY_OPENROUTER_DI_SINI',
        'base_url' => 'https://openrouter.ai/api/v1/chat/completions',
        'model' => 'openai/gpt-4o',
        'referer' => 'http://localhost:8080',
        'title' => 'Rankify.AI',
    ],
];
