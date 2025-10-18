<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatIDo extends Model
{
    protected $table = 'what_i_do';

    protected $fillable = ['title', 'description', 'icon'];
}
