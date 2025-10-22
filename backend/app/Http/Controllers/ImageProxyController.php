<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class ImageProxyController extends Controller
{
    public function show(Request $request, string $path): Response
    {
        // Hardening + normalizzazione
        $path = ltrim($path, '/');
        abort_if(str_contains($path, '..'), 400, 'Invalid path');
        $path = urldecode($path);

        // (opzionale) rifiuta parametri non usati
        if ($request->query()) {
            // se vuoi semplicemente ignorarli, commenta la riga sotto
            // abort(400, 'No query params allowed');
        }

        // Leggi l’originale dal disk 'src' (Supabase S3-compat)
        abort_unless(Storage::disk('src')->exists($path), 404, 'Image not found');
        $stream = Storage::disk('src')->readStream($path);
        abort_if($stream === false, 500, 'Unable to read source');

        // MIME dal file extension
        $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'webp'       => 'image/webp',
            'jpg','jpeg' => 'image/jpeg',
            'png'        => 'image/png',
            default      => 'application/octet-stream',
        };

        return response()->stream(function () use ($stream) {
            fpassthru($stream);
            if (is_resource($stream)) fclose($stream);
        }, 200, [
            'Content-Type'                  => $mime,
            'Cache-Control'                 => 'public, max-age=31536000, immutable',
            'Cross-Origin-Resource-Policy'  => 'cross-origin',
            'X-Content-Type-Options'        => 'nosniff',
        ]);
    }
}