<?php

namespace App\Services\Factories;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * FileUploadFactory
 * 
 * Factory per gestire l'upload di file su storage locale o Supabase.
 * Centralizza la logica di upload per evitare duplicazione di codice.
 */
class FileUploadFactory
{
    /**
     * Determina se usare Supabase o storage locale
     * 
     * @return bool
     */
    public static function shouldUseSupabase(): bool
    {
        $isProduction = app()->environment('production');
        $hasSupabaseConfig = !empty(config('filesystems.disks.src.key')) && 
                            !empty(config('filesystems.disks.src.secret')) &&
                            !empty(config('filesystems.disks.src.endpoint'));
        
        return $isProduction || $hasSupabaseConfig;
    }

    /**
     * Carica un file su storage (Supabase o locale)
     * 
     * @param UploadedFile $file File da caricare
     * @param string $relativePath Path relativo dove salvare il file
     * @param string $context Contesto per logging (es: "poster", "video")
     * @return string URL pubblico del file caricato
     * @throws RuntimeException Se l'upload fallisce
     */
    public static function upload(UploadedFile $file, string $relativePath, string $context = 'file'): string
    {
        if (self::shouldUseSupabase()) {
            return self::uploadToSupabase($file, $relativePath, $context);
        } else {
            return self::uploadToLocal($file, $relativePath, $context);
        }
    }

    /**
     * Carica file su Supabase
     * 
     * @param UploadedFile $file
     * @param string $relativePath
     * @param string $context
     * @return string URL pubblico
     * @throws RuntimeException
     */
    private static function uploadToSupabase(UploadedFile $file, string $relativePath, string $context): string
    {
        Log::info("Salvataggio {$context} su SUPABASE", [
            'relative_path' => $relativePath,
            'disk_config' => [
                'driver' => config('filesystems.disks.src.driver'),
                'bucket' => config('filesystems.disks.src.bucket'),
                'endpoint' => config('filesystems.disks.src.endpoint'),
                'has_key' => !empty(config('filesystems.disks.src.key')),
                'has_secret' => !empty(config('filesystems.disks.src.secret')),
            ]
        ]);
        
        try {
            $binary = file_get_contents($file->getRealPath());
            $binarySize = strlen($binary);
            
            Log::info("Binary {$context} caricato", ['size' => $binarySize]);
            
            $ok = Storage::disk('src')->put($relativePath, $binary);
            
            if (!$ok) {
                Log::error("Errore salvataggio {$context} su Supabase - put() ritorna false", [
                    'relative_path' => $relativePath,
                    'binary_size' => $binarySize,
                ]);
                throw new RuntimeException("Failed writing {$context} to Supabase - put() returned false");
            }
            
            // Verifica esistenza file
            $exists = Storage::disk('src')->exists($relativePath);
            if (!$exists) {
                Log::error("File {$context} non trovato dopo il salvataggio", [
                    'relative_path' => $relativePath,
                ]);
                throw new RuntimeException("File {$context} not found after upload - verification failed");
            }
            
            Log::info("{$context} salvato e verificato su Supabase", [
                'relative_path' => $relativePath,
                'file_exists' => $exists,
            ]);
            
            $baseUrl = rtrim(config('filesystems.disks.src.url') ?: env('SUPABASE_PUBLIC_URL'), '/');
            $publicUrl = $baseUrl . '/' . $relativePath;
            
            Log::info("URL pubblico {$context} generato", ['url' => $publicUrl]);
            
            return $publicUrl;
            
        } catch (\Exception $e) {
            Log::error("Eccezione durante salvataggio {$context} su Supabase", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'relative_path' => $relativePath,
            ]);
            throw new RuntimeException("Upload {$context} failed: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Carica file su storage locale
     * 
     * @param UploadedFile $file
     * @param string $relativePath
     * @param string $context
     * @return string Path relativo del file
     */
    private static function uploadToLocal(UploadedFile $file, string $relativePath, string $context): string
    {
        Log::info("Salvataggio {$context} in LOCALE", [
            'relative_path' => $relativePath,
        ]);
        
        // Estrai directory e filename da relativePath
        $pathInfo = pathinfo($relativePath);
        $directory = $pathInfo['dirname'];
        $filename = $pathInfo['basename'];
        
        // Rimuovi il prefisso se presente e salva in public
        $localPath = str_starts_with($directory, 'public/') 
            ? $directory 
            : "public/{$directory}";
        
        $file->storeAs($localPath, $filename);
        
        $publicPath = "storage/{$directory}/{$filename}";
        
        Log::info("{$context} salvato in locale", ['path' => $publicPath]);
        
        return $publicPath;
    }

    /**
     * Costruisce un path relativo per l'upload
     * 
     * @param string $baseFolder Cartella base (es: "project/1marziofarina/progetto-test")
     * @param string $filename Nome del file (es: "poster.jpg")
     * @return string Path relativo completo
     */
    public static function buildRelativePath(string $baseFolder, string $filename): string
    {
        return trim($baseFolder, '/') . '/' . trim($filename, '/');
    }

    /**
     * Genera un filename da un file caricato mantenendo l'estensione
     * 
     * @param UploadedFile $file
     * @param string $baseName Nome base (es: "poster", "video")
     * @return string Nome file completo con estensione
     */
    public static function generateFilename(UploadedFile $file, string $baseName): string
    {
        $extension = $file->getClientOriginalExtension();
        return "{$baseName}.{$extension}";
    }

    /**
     * Verifica se un file esiste nello storage
     * 
     * @param string $path Path del file
     * @param bool $useSupabase Se true, verifica su Supabase, altrimenti su locale
     * @return bool
     */
    public static function exists(string $path, ?bool $useSupabase = null): bool
    {
        $useSupabase = $useSupabase ?? self::shouldUseSupabase();
        
        if ($useSupabase) {
            return Storage::disk('src')->exists($path);
        } else {
            // Per storage locale, rimuovi il prefisso "storage/" se presente
            $path = str_starts_with($path, 'storage/') 
                ? substr($path, 8) 
                : $path;
            return Storage::disk('public')->exists($path);
        }
    }

    /**
     * Elimina un file dallo storage
     * 
     * @param string $path Path del file
     * @param bool $useSupabase Se true, elimina da Supabase, altrimenti da locale
     * @return bool
     */
    public static function delete(string $path, ?bool $useSupabase = null): bool
    {
        $useSupabase = $useSupabase ?? self::shouldUseSupabase();
        
        try {
            if ($useSupabase) {
                return Storage::disk('src')->delete($path);
            } else {
                $path = str_starts_with($path, 'storage/') 
                    ? substr($path, 8) 
                    : $path;
                return Storage::disk('public')->delete($path);
            }
        } catch (\Exception $e) {
            Log::warning('Eliminazione file fallita', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}

