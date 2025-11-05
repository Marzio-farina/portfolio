<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security Headers Middleware
 * 
 * Aggiunge header di sicurezza a tutte le risposte HTTP
 * per proteggere contro attacchi comuni (XSS, clickjacking, MIME sniffing, etc.)
 */
class SecurityHeadersMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // X-Content-Type-Options: Previene MIME type sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // X-Frame-Options: Previene clickjacking
        // SAMEORIGIN: permette iframe solo dallo stesso dominio
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

        // X-XSS-Protection: Abilita protezione XSS del browser
        // 1; mode=block: blocca la pagina se rileva XSS
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Referrer-Policy: Controlla quante informazioni vengono inviate nel referrer
        // strict-origin-when-cross-origin: invia solo l'origine in cross-origin
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions-Policy: Controlla quali feature del browser sono permesse
        // Disabilita feature non necessarie per sicurezza
        $response->headers->set('Permissions-Policy', implode(', ', [
            'geolocation=()',           // Nessuno può usare geolocalizzazione
            'microphone=()',            // Nessuno può usare microfono
            'camera=()',                // Nessuno può usare camera
            'payment=()',               // Nessuno può usare API payment
            'usb=()',                   // Nessuno può usare USB
            'magnetometer=()',          // Nessuno può usare magnetometro
            'gyroscope=()',             // Nessuno può usare giroscopio
            'accelerometer=()',         // Nessuno può usare accelerometro
        ]));

        // Content-Security-Policy (CSP): Previene XSS e injection attacks
        // Definisce sorgenti trusted per script, style, immagini, etc.
        $cspDirectives = [
            "default-src 'self'",                           // Default: solo stesso dominio
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Script: stesso dominio + inline (necessario per Angular)
            "style-src 'self' 'unsafe-inline'",             // Style: stesso dominio + inline
            "img-src 'self' data: https:",                  // Immagini: stesso dominio + data URIs + HTTPS
            "font-src 'self' data:",                        // Font: stesso dominio + data URIs
            "connect-src 'self' https:",                    // Fetch/XHR: stesso dominio + HTTPS
            "media-src 'self'",                             // Media: stesso dominio
            "object-src 'none'",                            // Nessun plugin (Flash, etc.)
            "frame-ancestors 'self'",                       // Chi può embeddare in iframe
            "base-uri 'self'",                              // Previene injection di <base>
            "form-action 'self'",                           // Form possono postare solo a stesso dominio
        ];
        
        // In development, CSP più permissivo per hot reload, etc.
        if (app()->environment('local', 'development')) {
            $cspDirectives = [
                "default-src 'self' localhost:* 127.0.0.1:*",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:*",
                "style-src 'self' 'unsafe-inline' localhost:* 127.0.0.1:*",
                "img-src 'self' data: https: localhost:* 127.0.0.1:*",
                "font-src 'self' data: localhost:* 127.0.0.1:*",
                "connect-src 'self' https: ws: wss: localhost:* 127.0.0.1:*",
                "media-src 'self' localhost:* 127.0.0.1:*",
                "object-src 'none'",
                "frame-ancestors 'self'",
                "base-uri 'self'",
                "form-action 'self'",
            ];
        }

        $response->headers->set('Content-Security-Policy', implode('; ', $cspDirectives));

        // Strict-Transport-Security (HSTS): Forza HTTPS
        // Solo in produzione
        if (app()->environment('production')) {
            // max-age=31536000: 1 anno
            // includeSubDomains: applica anche ai sottodomini
            // preload: permette inserimento in HSTS preload list
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }

        return $response;
    }
}

