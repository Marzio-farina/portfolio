<?php

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Http\Middleware\HttpCache;
use App\Http\Middleware\DatabaseConnectionMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\QueryException;
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
        $middleware->alias([
            'fresh' => EnsureTokenIsFresh::class,
            'http.cache' => HttpCache::class,
            'db.connection' => DatabaseConnectionMiddleware::class,
        ]);
        
        // Disabilita redirect per API quando non autenticato (restituisci JSON 401 invece)
        $middleware->redirectGuestsTo(fn () => null);
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
            // ValidationException -> 422 con dettagli
            if ($e instanceof ValidationException) {
                return new \Illuminate\Http\JsonResponse([
                    'ok'     => false,
                    'message'=> 'Validation failed',
                    'errors' => $e->errors(),
                ], 422, [], JSON_UNESCAPED_UNICODE);
            }
            // Unique/email già esistente: prova a mappare su 409
            if ($e instanceof QueryException) {
                $msg = $e->getMessage();
                if (stripos($msg, 'unique') !== false || stripos($msg, 'users_email') !== false) {
                    return new \Illuminate\Http\JsonResponse([
                        'ok'     => false,
                        'message'=> 'Email già registrata',
                    ], 409, [], JSON_UNESCAPED_UNICODE);
                }
            }
            // NotFound generiche
            if ($e instanceof \Symfony\Component\Routing\Exception\RouteNotFoundException) {
                return new \Illuminate\Http\JsonResponse(['ok' => false, 'error' => 'Not Found'], 404);
            }
            return new \Illuminate\Http\JsonResponse(['ok' => false, 'error' => 'Server Error'], 500);
        });
    })->create();