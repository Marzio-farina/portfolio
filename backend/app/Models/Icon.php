<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Icon extends Model
{
    protected $fillable = ['img', 'alt'];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
