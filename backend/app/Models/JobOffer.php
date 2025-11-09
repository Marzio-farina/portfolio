<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobOffer extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'company_name',
        'recruiter_company',
        'position',
        'work_mode',
        'location',
        'announcement_date',
        'application_date',
        'website',
        'is_registered',
        'status',
        'salary_range',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'announcement_date' => 'date',
        'application_date' => 'date',
        'is_registered' => 'boolean',
    ];

    /**
     * Get the user that owns the job offer.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

