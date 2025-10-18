<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cv extends Model
{
    use HasFactory;

    protected $table = 'curricula'; // nome irregolare

    protected $fillable = ['title', 'time_start', 'time_end', 'description'];

    protected $casts = [
        'time_start' => 'date',
        'time_end'   => 'date',
    ];
}
