<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Support\Facades\Route;

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

        $exceptions->render(function (Throwable $e) {
            // mantieni lo status code corretto per le HttpException
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                return new \Illuminate\Http\JsonResponse([
                    'ok'    => false,
                    'error' => $e->getMessage() ?: \Symfony\Component\HttpFoundation\Response::$statusTexts[$e->getStatusCode()] ?? 'Error',
                ], $e->getStatusCode(), $e->getHeaders(), JSON_UNESCAPED_UNICODE);
            }
            // NotFound generiche
            if ($e instanceof \Symfony\Component\Routing\Exception\RouteNotFoundException) {
                return new \Illuminate\Http\JsonResponse(['ok' => false, 'error' => 'Not Found'], 404);
            }
            return new \Illuminate\Http\JsonResponse(['ok' => false, 'error' => 'Server Error'], 500);
        });
    })->create();