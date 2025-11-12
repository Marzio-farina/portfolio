<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserJobOfferEmailColumn extends Model
{
    protected $fillable = [
        'user_id',
        'job_offer_email_column_id',
        'visible',
        'order',
    ];

    protected $casts = [
        'visible' => 'boolean',
    ];
}

