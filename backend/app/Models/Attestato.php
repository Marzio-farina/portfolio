<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attestato extends Model
{
    use SoftDeletes;

    protected $table = 'attestati';

    protected $fillable = [
        'user_id','title','description','poster',
        'issuer','issued_at','expires_at',
        'credential_id','credential_url',
        'status','is_featured','sort_order'
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'issued_at'   => 'date',
        'expires_at'  => 'date',
    ];
}