<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Technology extends Model
{
    protected $fillable = ['title', 'description', 'type', 'user_id'];

    /**
     * Relazione con User (tecnologie specifiche per utente)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relazione molti-a-molti con Project
     */
    public function projects(): BelongsToMany
    {
        // pivot: project_technology (project_id, technology_id)
        return $this->belongsToMany(Project::class, 'project_technology')
                    ->withPivot([]); // niente campi extra al momento
    }
}
