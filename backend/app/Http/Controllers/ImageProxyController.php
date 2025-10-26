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

        // Leggi l'originale dal disk 'public' (storage locale)
        abort_unless(Storage::disk('public')->exists($path), 404, 'Image not found');
        $stream = Storage::disk('public')->readStream($path);
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