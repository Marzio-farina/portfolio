<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

/**
 * CvFile Model
 * 
 * Rappresenta un file PDF del curriculum caricato da un utente.
 * Ogni utente può avere più file CV, con uno marcato come default.
 */
class CvFile extends Model
{
    use HasFactory;

    protected $table = 'cv_files';

    protected $fillable = [
        'user_id',
        'filename',
        'file_path',
        'mime_type',
        'file_size',
        'title',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'file_size' => 'integer',
    ];

    // ========================================================================
    // Relationships
    // ========================================================================

    /**
     * Get the user that owns this CV file
     *
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ========================================================================
    // Scopes
    // ========================================================================

    /**
     * Scope per ottenere il CV di default di un utente
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int|null $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDefaultForUser($query, ?int $userId = null)
    {
        // Postgres richiede confronto booleano nativo (TRUE/FALSE),
        // mentre SQLite/MySQL accettano 1/0. Usiamo condizione per driver.
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            $query->whereRaw('is_default = TRUE');
        } else {
            $query->where('is_default', true);
        }

        return $query->when($userId, fn($q) => $q->where('user_id', $userId));
    }

    /**
     * Scope per ottenere i CV di un utente specifico
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    // ========================================================================
    // Methods
    // ========================================================================

    /**
     * Imposta questo CV come default per l'utente
     * Rimuove il flag default da tutti gli altri CV dell'utente
     *
     * @return void
     */
    public function setAsDefault(): void
    {
        // Rimuovi il flag default da tutti i CV dell'utente
        static::where('user_id', $this->user_id)
              ->where('id', '!=', $this->id)
              ->update(['is_default' => false]);

        // Imposta questo come default
        $this->update(['is_default' => true]);
    }
}

