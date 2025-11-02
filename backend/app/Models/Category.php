<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use SoftDeletes;
    
    protected $fillable = ['title', 'description', 'user_id'];

    /**
     * Relazione con l'utente proprietario della categoria
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relazione con i progetti che usano questa categoria
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }
}
