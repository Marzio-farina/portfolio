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
        $exceptions->shouldRenderJsonWhen(fn () => true);

        $exceptions->render(function (Throwable $e, $request) {
            // Se è un'eccezione HTTP, mantieni status code e headers originali
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                return new \Illuminate\Http\JsonResponse([
                    'ok'    => false,
                    'error' => $e->getMessage() ?: \Symfony\Component\HttpFoundation\Response::$statusTexts[$e->getStatusCode()] ?? 'Error',
                    'trace' => app()->hasDebugModeEnabled() ? $e->getTrace() : null,
                ], $e->getStatusCode(), $e->getHeaders(), JSON_UNESCAPED_UNICODE);
            }

            // Route non trovata (es. RouteNotFoundException) -> 404
            if ($e instanceof \Symfony\Component\Routing\Exception\RouteNotFoundException) {
                return new \Illuminate\Http\JsonResponse([
                    'ok'    => false,
                    'error' => $e->getMessage() ?: 'Not Found',
                    'trace' => app()->hasDebugModeEnabled() ? $e->getTrace() : null,
                ], 404, [], JSON_UNESCAPED_UNICODE);
            }

            // Default: 500
            return new \Illuminate\Http\JsonResponse([
                'ok'    => false,
                'error' => $e->getMessage() ?: 'Server Error',
                'trace' => app()->hasDebugModeEnabled() ? $e->getTrace() : null,
            ], 500, [], JSON_UNESCAPED_UNICODE);
        });
    })->create();