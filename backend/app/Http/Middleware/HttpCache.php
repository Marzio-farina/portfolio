<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Uso: 'http.cache:{seconds}'
 * - Calcola ETag sul body della risposta
 * - Se If-None-Match coincide → 304 senza body
 * - Imposta Cache-Control public,max-age={seconds}
 */
class HttpCache
{
    public function handle(Request $request, Closure $next, int $seconds = 300): Response
    {
        /** @var \Symfony\Component\HttpFoundation\Response $response */
        $response = $next($request);

        // solo per 200/OK e metodi cacheabili
        if (!in_array($request->method(), ['GET','HEAD']) || $response->getStatusCode() !== 200) {
            return $response;
        }

        $content = $response->getContent() ?? '';
        $etag = '"' . md5($content) . '"';

        // Se il client ce l'ha già identico → 304
        $ifNoneMatch = $request->headers->get('If-None-Match');
        if ($ifNoneMatch && trim($ifNoneMatch) === $etag) {
            return response('', 304)->withHeaders([
                'ETag'          => $etag,
                'Cache-Control' => 'public, max-age='.$seconds,
            ]);
        }

        $response->headers->set('ETag', $etag);
        $response->headers->set('Cache-Control', 'public, max-age='.$seconds);
        return $response;
    }
}