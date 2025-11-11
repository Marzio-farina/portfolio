<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WhatIDo extends Model
{
    use SoftDeletes;

    protected $table = 'what_i_do';

    protected $fillable = ['title', 'description', 'icon', 'user_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
