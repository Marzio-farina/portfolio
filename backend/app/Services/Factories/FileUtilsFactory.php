<?php

namespace App\Services\Factories;

use Illuminate\Support\Str;

/**
 * FileUtilsFactory
 * 
 * Factory per utility relative ai file:
 * - Generazione nomi file casuali
 * - Conversione dimensioni (MB, GB -> bytes)
 * - Validazione estensioni
 * - Gestione MIME types
 */
class FileUtilsFactory
{
    /**
     * Genera un nome file randomico usando caratteri alfanumerici
     * 
     * Esempio: "a3b9c2d4e1"
     * 
     * @param int $length Lunghezza del nome (default: 10)
     * @return string Nome file casuale
     */
    public static function generateRandomFilename(int $length = 10): string
    {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyz';
        $randomName = '';
        $max = strlen($characters) - 1;
        
        for ($i = 0; $i < $length; $i++) {
            $randomName .= $characters[random_int(0, $max)];
        }
        
        return $randomName;
    }

    /**
     * Genera un nome file randomico con estensione
     * 
     * @param string $extension Estensione file (senza punto)
     * @param int $length Lunghezza nome base
     * @return string Nome file completo (es: "a3b9c2d4e1.jpg")
     */
    public static function generateRandomFilenameWithExtension(string $extension, int $length = 10): string
    {
        $randomName = self::generateRandomFilename($length);
        $extension = ltrim($extension, '.');
        
        return "{$randomName}.{$extension}";
    }

    /**
     * Genera un nome file univoco con UUID
     * 
     * @param string $extension Estensione file
     * @param string $prefix Prefisso opzionale
     * @return string Nome file con UUID
     */
    public static function generateUuidFilename(string $extension, string $prefix = ''): string
    {
        $uuid = Str::uuid()->toString();
        $extension = ltrim($extension, '.');
        
        if ($prefix) {
            $prefix = rtrim($prefix, '_') . '_';
        }
        
        return "{$prefix}{$uuid}.{$extension}";
    }

    /**
     * Converte valori come "2M", "100M", "8G" in bytes
     * 
     * @param string $value Valore da convertire (es: "128M", "2G")
     * @return int Dimensione in bytes
     */
    public static function convertToBytes(string $value): int
    {
        $value = trim($value);
        
        // Se è già un numero senza suffisso, restituiscilo
        if (is_numeric($value)) {
            return (int) $value;
        }
        
        $last = strtolower($value[strlen($value) - 1]);
        $numericValue = (int) $value;
        
        return match($last) {
            'g' => $numericValue * 1024 * 1024 * 1024,
            'm' => $numericValue * 1024 * 1024,
            'k' => $numericValue * 1024,
            default => $numericValue,
        };
    }

    /**
     * Converte bytes in formato leggibile (KB, MB, GB)
     * 
     * @param int $bytes Bytes da convertire
     * @param int $precision Decimali (default: 2)
     * @return string Formato leggibile (es: "1.5 MB")
     */
    public static function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }

    /**
     * Ottiene il MIME type da un'estensione
     * 
     * @param string $extension Estensione file (senza punto)
     * @return string MIME type
     */
    public static function getMimeType(string $extension): string
    {
        $extension = strtolower(ltrim($extension, '.'));
        
        return match($extension) {
            // Immagini
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            
            // Video
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'ogg' => 'video/ogg',
            'avi' => 'video/x-msvideo',
            'mov' => 'video/quicktime',
            
            // Documenti
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            
            // Archivi
            'zip' => 'application/zip',
            'rar' => 'application/x-rar-compressed',
            '7z' => 'application/x-7z-compressed',
            
            // Testo
            'txt' => 'text/plain',
            'json' => 'application/json',
            'xml' => 'application/xml',
            'csv' => 'text/csv',
            
            default => 'application/octet-stream',
        };
    }

    /**
     * Verifica se un'estensione è un'immagine
     * 
     * @param string $extension Estensione da verificare
     * @return bool True se è un'immagine
     */
    public static function isImage(string $extension): bool
    {
        $extension = strtolower(ltrim($extension, '.'));
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
        
        return in_array($extension, $imageExtensions, true);
    }

    /**
     * Verifica se un'estensione è un video
     * 
     * @param string $extension Estensione da verificare
     * @return bool True se è un video
     */
    public static function isVideo(string $extension): bool
    {
        $extension = strtolower(ltrim($extension, '.'));
        $videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
        
        return in_array($extension, $videoExtensions, true);
    }

    /**
     * Verifica se un'estensione è un documento
     * 
     * @param string $extension Estensione da verificare
     * @return bool True se è un documento
     */
    public static function isDocument(string $extension): bool
    {
        $extension = strtolower(ltrim($extension, '.'));
        $docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
        
        return in_array($extension, $docExtensions, true);
    }

    /**
     * Estrae l'estensione da un filename
     * 
     * @param string $filename Nome file
     * @return string Estensione (senza punto)
     */
    public static function getExtension(string $filename): string
    {
        return strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    }

    /**
     * Estrae il nome base da un filename (senza estensione)
     * 
     * @param string $filename Nome file
     * @return string Nome base
     */
    public static function getBasename(string $filename): string
    {
        return pathinfo($filename, PATHINFO_FILENAME);
    }

    /**
     * Valida che un file non superi una certa dimensione
     * 
     * @param int $fileSize Dimensione file in bytes
     * @param string $maxSize Dimensione massima (es: "5M", "100M")
     * @return bool True se valido
     */
    public static function validateFileSize(int $fileSize, string $maxSize): bool
    {
        $maxBytes = self::convertToBytes($maxSize);
        return $fileSize <= $maxBytes;
    }

    /**
     * Valida che un'estensione sia permessa
     * 
     * @param string $extension Estensione da validare
     * @param array $allowedExtensions Estensioni permesse
     * @return bool True se valida
     */
    public static function validateExtension(string $extension, array $allowedExtensions): bool
    {
        $extension = strtolower(ltrim($extension, '.'));
        $allowedExtensions = array_map(function($ext) {
            return strtolower(ltrim($ext, '.'));
        }, $allowedExtensions);
        
        return in_array($extension, $allowedExtensions, true);
    }
}

