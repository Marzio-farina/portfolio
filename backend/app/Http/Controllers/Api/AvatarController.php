<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Icon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            $filename = 'avatar_' . Str::uuid() . '.' . $file->getClientOriginalExtension();
            
            // Percorso di destinazione su Supabase S3
            $path = 'avatars/' . $filename;
            
            // Determina se usare Supabase o storage locale
            $supabaseUrl = env('SUPABASE_S3_URL') ?: env('SUPABASE_PUBLIC_URL');
            $useSupabase = env('SUPABASE_S3_KEY') && $supabaseUrl;
            
            if ($useSupabase) {
                // Ottimizza prima di caricare
                $tempPath = sys_get_temp_dir() . '/' . $filename;
                $image = Image::make($file);
                $image->resize(200, 200, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                });
                $image->save($tempPath, 85);
                
                // Carica su Supabase S3
                Storage::disk('src')->put($path, file_get_contents($tempPath));
                unlink($tempPath);
                
                // URL pubblico Supabase
                $baseUrl = rtrim($supabaseUrl, '/');
                $imgUrl = $baseUrl . '/' . $path;
                
                // Crea il record nella tabella icons con URL Supabase
                $icon = Icon::create([
                    'img' => $imgUrl,
                    'alt' => $validated['alt_text'] ?? 'Avatar visitatore',
                    'type' => 'user_uploaded'
                ]);
            } else {
                // Fallback a storage locale per development
                $storedPath = $file->storeAs('avatars', $filename, 'public');
                $this->optimizeImage($storedPath);
                
                // Costruisci URL assoluto
                $request = request();
                $scheme = $request->header('x-forwarded-proto', $request->getScheme());
                $host = $request->getHttpHost();
                $baseUrl = rtrim($scheme . '://' . $host, '/');
                
                $imgUrl = 'storage/' . $storedPath;
                $absoluteUrl = $baseUrl . '/' . $imgUrl;
                
                // Crea il record nella tabella icons
                $icon = Icon::create([
                    'img' => $absoluteUrl,
                    'alt' => $validated['alt_text'] ?? 'Avatar visitatore',
                    'type' => 'user_uploaded'
                ]);
            }
            
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
            // Se c'è un errore, rimuovi il file caricato
            if (isset($storedPath) && Storage::disk('public')->exists($storedPath)) {
                Storage::disk('public')->delete($storedPath);
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
            \Log::warning('Image optimization failed', [
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
            
            // Rimuovi il file se esiste
            if ($icon->img && str_starts_with($icon->img, 'storage/')) {
                $filePath = str_replace('storage/', '', $icon->img);
                if (Storage::disk('public')->exists($filePath)) {
                    Storage::disk('public')->delete($filePath);
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
