<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class JobOfferEmailColumn extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'field_name',
        'default_order',
    ];

    /**
     * Get the users that have this column configured
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_job_offer_email_columns')
            ->withPivot(['visible', 'order'])
            ->withTimestamps();
    }
}

