<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CvFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Illuminate\Http\RedirectResponse;

/**
 * CV File Controller
 * 
 * Gestisce l'upload e il download dei file PDF del curriculum.
 */
class CvFileController extends Controller
{
    /**
     * Ottiene il CV di default per un utente specifico
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getDefault(Request $request): JsonResponse
    {
        // Leggi user_id dalla query string o usa l'utente autenticato
        $userId = $request->query('user_id') ? (int) $request->query('user_id') : null;
        
        if (!$userId && Auth::check()) {
            $userId = Auth::id();
        }

        // Se non specificato, usa l'utente pubblico (per portfolio pubblico)
        if (!$userId) {
            $publicUserId = (int) env('PUBLIC_USER_ID', 0);
            $publicEmail = env('PUBLIC_USER_EMAIL', 'marziofarina@icloud.com');
            
            if ($publicUserId > 0) {
                $userId = $publicUserId;
            } elseif ($publicEmail) {
                $user = \App\Models\User::where('email', $publicEmail)->first();
                $userId = $user ? $user->id : null;
            }
        }

        if (!$userId) {
            return response()->json([
                'success' => false,
                'message' => 'Nessun CV disponibile'
            ], 404);
        }

        $cvFile = CvFile::defaultForUser($userId)->first();

        if (!$cvFile) {
            return response()->json([
                'success' => false,
                'message' => 'Nessun CV trovato per questo utente'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'cv' => [
                'id' => $cvFile->id,
                'filename' => $cvFile->filename,
                'title' => $cvFile->title,
                'file_size' => $cvFile->file_size,
                'download_url' => route('api.cv-files.download', ['id' => $cvFile->id]),
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Ottiene tutti i CV di un utente
     * 
     * @param Request $request
     * @param int|null $userId
     * @return JsonResponse
     */
    public function index(Request $request, ?int $userId = null): JsonResponse
    {
        if (!$userId && Auth::check()) {
            $userId = Auth::id();
        }

        if (!$userId) {
            return response()->json([
                'success' => false,
                'message' => 'Utente non specificato'
            ], 400);
        }

        $cvFiles = CvFile::forUser($userId)
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'cvs' => $cvFiles->map(fn($cv) => [
                'id' => $cv->id,
                'filename' => $cv->filename,
                'title' => $cv->title,
                'file_size' => $cv->file_size,
                'is_default' => $cv->is_default,
                'created_at' => $cv->created_at->toIso8601String(),
                'download_url' => route('api.cv-files.download', ['id' => $cv->id]),
            ])
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Download del file PDF del curriculum
     * 
     * @param int $id ID del file CV
     * @return Response|RedirectResponse|BinaryFileResponse
     */
    public function download(int $id)
    {
        $cvFile = CvFile::findOrFail($id);

        // Verifica che il file esista
        $filePath = $cvFile->file_path;
        $isUrl = str_starts_with($filePath, 'http://') || str_starts_with($filePath, 'https://');

        if ($isUrl) {
            // Per file su cloud (Supabase), restituisci redirect o proxy
            return redirect($filePath);
        }

        // File locale: gestisce path con/senza prefisso storage/
        $relativePath = str_starts_with($filePath, 'storage/') 
            ? str_replace('storage/', '', $filePath) 
            : $filePath;

        $disk = Storage::disk('public');
        
        if (!$disk->exists($relativePath)) {
            abort(404, 'File non trovato');
        }

        return response()->download(
            $disk->path($relativePath),
            $cvFile->filename,
            [
                'Content-Type' => $cvFile->mime_type ?? 'application/pdf',
            ]
        );
    }

    /**
     * Upload di un nuovo file PDF del curriculum
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function upload(Request $request): JsonResponse
    {
        // Richiede autenticazione
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Autenticazione richiesta'
            ], 401);
        }

        $userId = Auth::id();

        // Validazione del file
        $validated = $request->validate([
            'cv_file' => 'required|file|mimes:pdf|max:10240', // Max 10MB
            'title' => 'nullable|string|max:255',
            'is_default' => 'nullable|boolean',
        ]);

        try {
            $file = $request->file('cv_file');

            // Genera nome file unico
            $extension = $file->getClientOriginalExtension();
            $filename = 'cv_' . $userId . '_' . Str::uuid() . '.' . $extension;
            
            // Determina il path in base all'ambiente
            $relativePath = app()->environment('production')
                ? ('cv-files/' . $filename)
                : ('cv-files/' . $filename);

            if (app()->environment('production')) {
                // PRODUZIONE: salva su Supabase
                $binary = file_get_contents($file->getRealPath());
                $ok = Storage::disk('src')->put($relativePath, $binary);
                
                if (!$ok) {
                    throw new \RuntimeException('Failed writing CV file to src disk');
                }

                // URL pubblico dal disco 'src'
                $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                $filePath = $baseUrl . '/' . $relativePath;
            } else {
                // LOCALE: salva su disco pubblico
                $storedPath = $file->storeAs('cv-files', $filename, 'public');
                $filePath = 'storage/' . ltrim($storedPath, '/');
            }

            // Crea il record nella tabella cv_files
            $cvFile = CvFile::create([
                'user_id' => $userId,
                'filename' => $file->getClientOriginalName(),
                'file_path' => $filePath,
                'mime_type' => $file->getMimeType() ?? 'application/pdf',
                'file_size' => $file->getSize(),
                'title' => $validated['title'] ?? null,
                'is_default' => $validated['is_default'] ?? false,
            ]);

            // Se è impostato come default, aggiorna gli altri
            if ($cvFile->is_default) {
                $cvFile->setAsDefault();
            }

            return response()->json([
                'success' => true,
                'cv' => [
                    'id' => $cvFile->id,
                    'filename' => $cvFile->filename,
                    'title' => $cvFile->title,
                    'file_size' => $cvFile->file_size,
                    'is_default' => $cvFile->is_default,
                    'download_url' => route('api.cv-files.download', ['id' => $cvFile->id]),
                ],
                'message' => 'CV caricato con successo'
            ], 201, [], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            // Cleanup in caso di errore
            if (isset($relativePath)) {
                try {
                    if (app()->environment('production')) {
                        Storage::disk('src')->delete($relativePath);
                    } else if (isset($storedPath) && Storage::disk('public')->exists($storedPath)) {
                        Storage::disk('public')->delete($storedPath);
                    }
                } catch (\Throwable $cleanupError) {
                    // best-effort
                }
            }

            Log::error('CV upload failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Errore durante il caricamento: ' . $e->getMessage()
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * Elimina un file CV
     * 
     * @param int $id ID del file CV
     * @return JsonResponse
     */
    public function delete(int $id): JsonResponse
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Autenticazione richiesta'
            ], 401);
        }

        try {
            $cvFile = CvFile::findOrFail($id);

            // Verifica che l'utente sia il proprietario
            if ($cvFile->user_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorizzato'
                ], 403);
            }

            // Rimuovi il file fisico
            $filePath = $cvFile->file_path;
            $isUrl = str_starts_with($filePath, 'http://') || str_starts_with($filePath, 'https://');

            if (!$isUrl) {
                // File locale
                $relativePath = str_starts_with($filePath, 'storage/') 
                    ? str_replace('storage/', '', $filePath) 
                    : $filePath;
                
                if (Storage::disk('public')->exists($relativePath)) {
                    Storage::disk('public')->delete($relativePath);
                }
            } else {
                // File su cloud - rimuovi dal disco src se possibile
                $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
                $relative = ltrim(str_replace($baseUrl, '', $filePath), '/');
                if ($relative) {
                    Storage::disk('src')->delete($relative);
                }
            }

            // Rimuovi il record
            $cvFile->delete();

            return response()->json([
                'success' => true,
                'message' => 'CV eliminato con successo'
            ], 200, [], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore durante l\'eliminazione: ' . $e->getMessage()
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
}

