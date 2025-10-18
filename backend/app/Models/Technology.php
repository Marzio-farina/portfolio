<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Technology extends Model
{
    protected $fillable = ['title', 'description'];

    public function projects()
    {
        // pivot: project_technology (project_id, technology_id)
        return $this->belongsToMany(Project::class, 'project_technology')
                    ->withPivot([]); // niente campi extra al momento
    }
}
