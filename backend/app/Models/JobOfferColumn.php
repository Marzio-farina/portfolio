<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class JobOfferColumn extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'field_name',
        'default_order',
    ];

    /**
     * Get the users that have configured this column.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_job_offer_columns')
            ->withPivot(['visible', 'order'])
            ->withTimestamps();
    }
}

