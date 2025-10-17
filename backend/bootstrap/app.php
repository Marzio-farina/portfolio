<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->use([
            HandleCors::class,
        ]);
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Restituisci sempre JSON (evita qualsiasi tentativo di usare view)
        $exceptions->shouldRenderJsonWhen(fn () => true);

        // Render universale che non usa response()
        $exceptions->render(function (Throwable $e, $request) {
            return new \Illuminate\Http\JsonResponse([
                'ok'    => false,
                'error' => $e->getMessage(),
                // mostra il trace solo se APP_DEBUG=true
                'trace' => app()->hasDebugModeEnabled() ? $e->getTrace() : null,
            ], 500, [], JSON_UNESCAPED_UNICODE);
        });
    })->create();