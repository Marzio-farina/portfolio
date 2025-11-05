<?php

namespace App\Services\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * AuthorizationFactory
 * 
 * Factory per centralizzare controlli di autorizzazione.
 * Gestisce logiche comuni di verifica proprietà e permessi admin.
 */
class AuthorizationFactory
{
    /**
     * Determina se un utente è admin
     * 
     * @param User $user Utente da verificare
     * @return bool True se è admin
     */
    public static function isAdmin(User $user): bool
    {
        $adminEmail = env('PUBLIC_USER_EMAIL', 'marziofarina@icloud.com');
        return $user->email === $adminEmail;
    }

    /**
     * Verifica se l'utente può modificare una risorsa
     * 
     * L'utente può modificare se:
     * - È il proprietario della risorsa (user_id corrisponde)
     * - È admin
     * - La risorsa non ha proprietario (user_id null) e l'utente è admin
     * 
     * @param User $user Utente che richiede l'azione
     * @param Model $resource Risorsa da modificare
     * @param string $userIdField Nome del campo user_id nel model (default: "user_id")
     * @return bool True se autorizzato
     */
    public static function canUpdate(User $user, Model $resource, string $userIdField = 'user_id'): bool
    {
        $isAdmin = self::isAdmin($user);
        
        try {
            $resourceUserId = $resource->$userIdField ?? null;
        } catch (\Exception $e) {
            // Se il campo non esiste, solo admin può modificare
            Log::warning("Campo {$userIdField} non trovato nel model", [
                'model' => get_class($resource),
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return $isAdmin;
        }
        
        // Autorizzato se:
        // 1. È il proprietario
        // 2. La risorsa non ha proprietario e l'utente è admin
        // 3. L'utente è admin (può modificare qualsiasi risorsa)
        return $resourceUserId === $user->id 
            || ($resourceUserId === null && $isAdmin) 
            || $isAdmin;
    }

    /**
     * Verifica se l'utente può eliminare una risorsa
     * 
     * Stessa logica di canUpdate
     * 
     * @param User $user Utente che richiede l'azione
     * @param Model $resource Risorsa da eliminare
     * @param string $userIdField Nome del campo user_id nel model
     * @return bool True se autorizzato
     */
    public static function canDelete(User $user, Model $resource, string $userIdField = 'user_id'): bool
    {
        return self::canUpdate($user, $resource, $userIdField);
    }

    /**
     * Verifica se l'utente può visualizzare una risorsa
     * 
     * @param User|null $user Utente (può essere null per risorse pubbliche)
     * @param Model $resource Risorsa da visualizzare
     * @param bool $isPublic Se true, la risorsa è pubblica (default: true)
     * @param string $userIdField Nome del campo user_id nel model
     * @return bool True se autorizzato
     */
    public static function canView(?User $user, Model $resource, bool $isPublic = true, string $userIdField = 'user_id'): bool
    {
        // Risorsa pubblica: tutti possono vedere
        if ($isPublic) {
            return true;
        }
        
        // Nessun utente autenticato: non può vedere risorse private
        if (!$user) {
            return false;
        }
        
        $isAdmin = self::isAdmin($user);
        
        try {
            $resourceUserId = $resource->$userIdField ?? null;
        } catch (\Exception $e) {
            // Se il campo non esiste e l'utente è admin, può vedere
            return $isAdmin;
        }
        
        // Può vedere se è proprietario o admin
        return $resourceUserId === $user->id || $isAdmin;
    }

    /**
     * Verifica se l'utente può creare una risorsa per un altro utente
     * 
     * @param User $user Utente che crea
     * @param int|null $targetUserId ID dell'utente target (null = se stesso)
     * @return bool True se autorizzato
     */
    public static function canCreateFor(User $user, ?int $targetUserId): bool
    {
        // Se non specifica target, crea per se stesso: sempre autorizzato
        if ($targetUserId === null || $targetUserId === $user->id) {
            return true;
        }
        
        // Se vuole creare per un altro utente, deve essere admin
        return self::isAdmin($user);
    }

    /**
     * Lancia un'eccezione se l'utente non è autorizzato
     * 
     * @param User $user Utente da verificare
     * @param Model $resource Risorsa
     * @param string $action Azione richiesta ("update", "delete", "view")
     * @param string $userIdField Campo user_id
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public static function authorize(User $user, Model $resource, string $action = 'update', string $userIdField = 'user_id'): void
    {
        $authorized = match($action) {
            'update' => self::canUpdate($user, $resource, $userIdField),
            'delete' => self::canDelete($user, $resource, $userIdField),
            'view' => self::canView($user, $resource, false, $userIdField),
            default => false,
        };
        
        if (!$authorized) {
            throw new \Illuminate\Auth\Access\AuthorizationException('Non autorizzato');
        }
    }

    /**
     * Ottiene l'ID dell'utente pubblico/principale
     * 
     * @return int ID dell'utente pubblico
     */
    public static function getPublicUserId(): int
    {
        return (int) (env('PUBLIC_USER_ID') ?? 1);
    }

    /**
     * Ottiene l'email dell'utente admin/pubblico
     * 
     * @return string Email admin
     */
    public static function getAdminEmail(): string
    {
        return env('PUBLIC_USER_EMAIL', 'marziofarina@icloud.com');
    }

    /**
     * Log di un tentativo di accesso non autorizzato
     * 
     * @param User $user Utente che ha tentato l'accesso
     * @param Model $resource Risorsa a cui ha tentato di accedere
     * @param string $action Azione tentata
     */
    public static function logUnauthorizedAttempt(User $user, Model $resource, string $action): void
    {
        Log::warning('Tentativo di accesso non autorizzato', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'resource_type' => get_class($resource),
            'resource_id' => $resource->id ?? 'unknown',
            'action' => $action,
            'is_admin' => self::isAdmin($user),
        ]);
    }
}

