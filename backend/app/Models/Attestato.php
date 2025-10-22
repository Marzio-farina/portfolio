<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attestato extends Model
{
    use SoftDeletes;

    protected $table = 'attestati';

    protected $fillable = [
        'user_id',
        'title','description',
        'poster','poster_alt','poster_w','poster_h','poster_lqip',
        'issuer','issued_at','expires_at',
        'credential_id','credential_url',
        'status','is_featured','sort_order',
    ];

    protected $casts = [
        'issued_at' => 'date',
        'expires_at'=> 'date',
        'is_featured' => 'boolean',
    ];

    public function scopePublished($q) { return $q->where('status','published'); }
}