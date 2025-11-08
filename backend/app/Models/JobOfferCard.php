<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class JobOfferCard extends Model
{
    /**
     * I campi assegnabili in massa
     */
    protected $fillable = [
        'title',
        'type',
        'icon_svg',
    ];

    /**
     * Relazione Many-to-Many con gli utenti
     * Ogni card può essere configurata (visible/hidden) da molti utenti
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_job_offer_card')
            ->withPivot('visible')
            ->withTimestamps();
    }
}
