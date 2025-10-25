<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Testimonial extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'author_name', // Nome del visitatore
        'author_surname', // Cognome del visitatore
        'avatar_url', // Icona/immagine del visitatore
        'text',
        'role_company',
        'company',
        'rating',
        'ip_address', // Indirizzo IP del visitatore
        'user_agent', // User-Agent del dispositivo/browser
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    /**
     * Get the user that owns the testimonial (if registered)
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope per ottenere i testimonial di utenti registrati
     */
    public function scopeFromUsers($query)
    {
        return $query->whereNotNull('user_id');
    }

    /**
     * Scope per ottenere i testimonial di visitatori non registrati
     */
    public function scopeFromVisitors($query)
    {
        return $query->whereNull('user_id');
    }

    /**
     * Verifica se il testimonial è di un utente registrato
     */
    public function isFromUser(): bool
    {
        return $this->user_id !== null;
    }

    /**
     * Verifica se il testimonial è di un visitatore non registrato
     */
    public function isFromVisitor(): bool
    {
        return $this->user_id === null;
    }

    /**
     * Metodo helper per ottenere il nome completo dell'autore
     */
    public function getAuthorFullNameAttribute(): string
    {
        if ($this->isFromUser() && $this->user) {
            return trim($this->user->name . ' ' . $this->user->surname);
        }
        
        return trim($this->author_name . ' ' . ($this->author_surname ?? ''));
    }
}
