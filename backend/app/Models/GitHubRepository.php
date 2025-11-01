<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GitHubRepository extends Model
{
    protected $table = 'github_repositories';
    
    protected $fillable = [
        'user_id',
        'owner',
        'repo',
        'url',
        'order',
    ];

    /**
     * Relazione con l'utente
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
