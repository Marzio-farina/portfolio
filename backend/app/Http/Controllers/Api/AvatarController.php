<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Icon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;

/**
 * Avatar Upload Controller
 * 
 * Handles avatar uploads for testimonials visitors.
 * Validates, resizes, and stores avatar images with proper security measures.
 */
class AvatarController extends Controller
{
    /**
     * Upload avatar for testimonial visitor
     * 
     * Accepts image file upload, validates it, resizes if necessary,
     * stores it in public storage and creates icon record.
     * 
     * @param Request $request HTTP request with image file
     * @return JsonResponse Created icon data or validation errors
     */
    public function upload(Request $request): JsonResponse
    {
        // Validazione del file
        $validated = $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048', // Max 2MB
            'alt_text' => 'nullable|string|max:100',
        ]);

        try {
            $file = $request->file('avatar');

            // Genera nome file unico
            $extension = $file->getClientOriginalExtension();
            $filename = 'avatar_' . Str::uuid() . '.' . $extension;
            $relativePath = 'avatars/' . $filename;

            if (app()->environment('production')) {
                // PRODUZIONE: salva su storage S3 (Supabase) usando il disco 'src'
                // Tenta ottimizzazione; in caso di errore salva l'originale
                $binary = file_get_contents($file->getRealPath());
                try {
                    $image = Image::make($file->getRealPath());
                    $image->resize(200, 200, function ($constraint) {
                        $constraint->aspectRatio();
                        $constraint->upsize();
                    });
                    $binary = (string) $image->encode($extension, 85);
                } catch (\Throwable $e) {
                    // fallback: usa l'originale senza bloccare l'upload
                    Log::warning('Avatar optimization skipped (prod fallback).', ['error' => $e->getMessage()]);
                }

                $ok = Storage::disk('src')->put($relativePath, $binary);
                if (!$ok) {
                    throw new \RuntimeException('Failed writing avatar to src disk');
                }

                // URL pubblico dal disco 'src'
                $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                $imgPath = $baseUrl . '/' . $relativePath; // assoluto per il CDN
                $storedPath = $relativePath; // per eventuale cleanup
            } else {
                // LOCALE: salva su disco pubblico e servi via /storage
                $storedPath = $file->storeAs('avatars', $filename, 'public');
                $this->optimizeImage($storedPath);
                $imgPath = 'storage/' . ltrim($storedPath, '/');
            }
            
            // Crea il record nella tabella icons con path relativo
            $icon = Icon::create([
                'img' => $imgPath,
                'alt' => $validated['alt_text'] ?? 'Avatar visitatore',
                'type' => 'user_uploaded'
            ]);
            
            return response()->json([
                'success' => true,
                'icon' => [
                    'id' => $icon->id,
                    'img' => $icon->img,
                    'alt' => $icon->alt,
                ],
                'message' => 'Avatar caricato con successo'
            ], 201);
            
        } catch (\Exception $e) {
            // Se c'è un errore, prova a rimuovere l'eventuale file caricato
            if (isset($storedPath)) {
                try {
                    if (app()->environment('production')) {
                        Storage::disk('src')->delete($storedPath);
                    } else if (Storage::disk('public')->exists($storedPath)) {
                        Storage::disk('public')->delete($storedPath);
                    }
                } catch (\Throwable $cleanupError) {
                    // best-effort
                }
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Errore durante il caricamento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Optimize uploaded image
     * 
     * Resizes and compresses the uploaded image to standard dimensions
     * and file size for better performance.
     * 
     * @param string $path Path to the stored image
     * @return void
     */
    private function optimizeImage(string $path): void
    {
        try {
            $fullPath = Storage::disk('public')->path($path);
            
            // Carica l'immagine con Intervention Image
            $image = Image::make($fullPath);
            
            // Ridimensiona mantenendo le proporzioni (max 200x200)
            $image->resize(200, 200, function ($constraint) {
                $constraint->aspectRatio();
                $constraint->upsize(); // Non ingrandire se è già più piccola
            });
            
            // Salva ottimizzata
            $image->save($fullPath, 85); // Qualità 85%
            
        } catch (\Exception $e) {
            // Se l'ottimizzazione fallisce, continua comunque
            Log::warning('Image optimization failed', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Delete avatar icon
     * 
     * Removes the icon record and associated file from storage.
     * 
     * @param int $id Icon ID
     * @return JsonResponse Success or error response
     */
    public function delete(int $id): JsonResponse
    {
        try {
            $icon = Icon::findOrFail($id);
            
            // Rimuovi il file se esiste (gestisce sia path con "storage/" che senza)
            if ($icon->img) {
                // Se è URL assoluto (cloud), elimina sul disco 'src'
                if (str_starts_with($icon->img, 'http://') || str_starts_with($icon->img, 'https://')) {
                    $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                    $relative = ltrim(str_replace($baseUrl, '', $icon->img), '/');
                    if ($relative) {
                        Storage::disk('src')->delete($relative);
                    }
                } else {
                    // Locale: gestisci path con/ senza prefisso storage/
                    $filePath = str_starts_with($icon->img, 'storage/') 
                        ? str_replace('storage/', '', $icon->img) 
                        : $icon->img;
                    if (Storage::disk('public')->exists($filePath)) {
                        Storage::disk('public')->delete($filePath);
                    }
                }
            }
            
            // Rimuovi il record
            $icon->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Avatar eliminato con successo'
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore durante l\'eliminazione: ' . $e->getMessage()
            ], 500);
        }
    }
}
