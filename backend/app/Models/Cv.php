<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cv extends Model
{
    protected $table = 'c_v'; // nome irregolare

    protected $fillable = ['title', 'time_start', 'time_end', 'description'];

    protected $casts = [
        'time_start' => 'date',
        'time_end'   => 'date',
    ];
}
