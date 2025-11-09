<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class UserJobOfferColumn extends Pivot
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'user_job_offer_columns';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = true;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'job_offer_column_id',
        'visible',
        'order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'visible' => 'boolean',
    ];
}

