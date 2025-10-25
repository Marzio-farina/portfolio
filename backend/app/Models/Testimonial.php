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
        'icon_id', // Icona del visitatore (FK → icons.id)
        'avatar_url', // Icona/immagine del visitatore (DEPRECATO - mantenuto per compatibilità)
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
     * Get the icon for the testimonial author (visitor or user)
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function icon()
    {
        return $this->belongsTo(Icon::class);
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

    /**
     * Metodo helper per ottenere l'icona dell'autore
     * Priorità: icon_id (nuovo) > user.icon (se utente registrato) > avatar_url (deprecato)
     */
    public function getAuthorIconAttribute(): ?string
    {
        // Se ha icon_id specifico (nuovo sistema)
        if ($this->icon_id && $this->icon) {
            return $this->icon->img;
        }
        
        // Se è un utente registrato, usa la sua icona
        if ($this->isFromUser() && $this->user && $this->user->icon) {
            return $this->user->icon->img;
        }
        
        // Fallback al vecchio sistema (deprecato)
        return $this->avatar_url;
    }

    /**
     * Metodo helper per ottenere l'alt text dell'icona
     */
    public function getAuthorIconAltAttribute(): ?string
    {
        // Se ha icon_id specifico
        if ($this->icon_id && $this->icon) {
            return $this->icon->alt ?? $this->getAuthorFullNameAttribute();
        }
        
        // Se è un utente registrato
        if ($this->isFromUser() && $this->user && $this->user->icon) {
            return $this->user->icon->alt ?? $this->getAuthorFullNameAttribute();
        }
        
        // Fallback
        return $this->getAuthorFullNameAttribute();
    }
}
