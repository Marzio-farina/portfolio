<?php

namespace App\Services\Factories;

use App\Models\User;

/**
 * SlugFactory
 * 
 * Factory per generare slug e nomi di cartelle standardizzati.
 * Centralizza la logica di generazione slug per evitare duplicazione.
 */
class SlugFactory
{
    /**
     * Genera il nome della cartella utente: {id_utente}{nome_utente}
     * 
     * Esempio: "1marziofarina" o "2johndoe"
     * 
     * @param User $user Utente per cui generare il nome cartella
     * @return string Nome cartella standardizzato
     */
    public static function generateUserFolderName(User $user): string
    {
        $username = $user->name ?? $user->email ?? 'user';
        
        // Rimuovi spazi e caratteri speciali, mantieni solo alfanumerici
        $username = preg_replace('/[^a-zA-Z0-9]/', '', $username);
        
        // Se dopo la pulizia il nome è vuoto, usa "user"
        if (empty($username)) {
            $username = 'user';
        }
        
        return $user->id . $username;
    }

    /**
     * Crea uno slug da un titolo generico
     * 
     * Converte il titolo in un formato slug-friendly:
     * - Tutto minuscolo
     * - Spazi e caratteri speciali diventano trattini
     * - Rimuove trattini multipli
     * - Max 50 caratteri
     * 
     * Esempio: "Il Mio Progetto 2024!" -> "il-mio-progetto-2024"
     * 
     * @param string $title Titolo da convertire
     * @param int $maxLength Lunghezza massima dello slug (default: 50)
     * @param string $fallbackPrefix Prefisso per fallback se slug vuoto (default: "item")
     * @return string Slug generato
     */
    public static function generate(string $title, int $maxLength = 50, string $fallbackPrefix = 'item'): string
    {
        // Converte in minuscolo
        $slug = mb_strtolower($title, 'UTF-8');
        
        // Sostituisce spazi e caratteri speciali con trattini
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        
        // Rimuove trattini multipli
        $slug = preg_replace('/-+/', '-', $slug);
        
        // Rimuove trattini iniziali/finali
        $slug = trim($slug, '-');
        
        // Limita la lunghezza
        $slug = mb_substr($slug, 0, $maxLength);
        
        // Se vuoto dopo la pulizia, usa fallback con timestamp
        if (empty($slug)) {
            $slug = $fallbackPrefix . '-' . time();
        }
        
        return $slug;
    }

    /**
     * Genera uno slug per un progetto
     * 
     * @param string $projectName Nome del progetto
     * @return string Slug del progetto
     */
    public static function generateProjectSlug(string $projectName): string
    {
        return self::generate($projectName, 50, 'project');
    }

    /**
     * Genera uno slug per un attestato
     * 
     * @param string $attestatoTitle Titolo dell'attestato
     * @return string Slug dell'attestato
     */
    public static function generateAttestatoSlug(string $attestatoTitle): string
    {
        return self::generate($attestatoTitle, 50, 'attestato');
    }

    /**
     * Genera un path completo per una risorsa utente
     * 
     * Esempio: "project/1marziofarina/il-mio-progetto"
     * 
     * @param string $resourceType Tipo di risorsa (es: "project", "attestati", "avatar")
     * @param User $user Utente proprietario
     * @param string $resourceTitle Titolo della risorsa
     * @return string Path completo
     */
    public static function generateResourcePath(string $resourceType, User $user, string $resourceTitle): string
    {
        $userFolder = self::generateUserFolderName($user);
        $resourceSlug = self::generate($resourceTitle);
        
        return trim($resourceType, '/') . '/' . $userFolder . '/' . $resourceSlug;
    }

    /**
     * Genera un path per progetto
     * 
     * @param User $user Utente proprietario
     * @param string $projectTitle Titolo del progetto
     * @return string Path completo (es: "project/1marziofarina/mio-progetto")
     */
    public static function generateProjectPath(User $user, string $projectTitle): string
    {
        return self::generateResourcePath('project', $user, $projectTitle);
    }

    /**
     * Genera un path per attestato
     * 
     * @param User $user Utente proprietario
     * @param string $attestatoTitle Titolo dell'attestato
     * @return string Path completo (es: "attestati/1marziofarina/attestato-corso")
     */
    public static function generateAttestatoPath(User $user, string $attestatoTitle): string
    {
        return self::generateResourcePath('attestati', $user, $attestatoTitle);
    }

    /**
     * Sanifica un nome file rimuovendo caratteri non sicuri
     * 
     * @param string $filename Nome file da sanificare
     * @return string Nome file sanificato
     */
    public static function sanitizeFilename(string $filename): string
    {
        // Mantieni l'estensione
        $pathInfo = pathinfo($filename);
        $name = $pathInfo['filename'];
        $extension = $pathInfo['extension'] ?? '';
        
        // Rimuovi caratteri pericolosi
        $name = preg_replace('/[^a-zA-Z0-9_-]/', '-', $name);
        $name = preg_replace('/-+/', '-', $name);
        $name = trim($name, '-');
        
        // Ricostruisci il nome file
        return $extension ? "{$name}.{$extension}" : $name;
    }
}

