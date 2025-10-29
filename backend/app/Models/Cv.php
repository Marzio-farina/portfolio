<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cv extends Model
{
    use HasFactory;

    protected $table = 'curricula'; // nome irregolare

    protected $fillable =
    [
        'user_id',
        'type',
        'title',
        'time_start',
        'time_end',
        'description'
    ];

    protected $casts = [
        'time_start' => 'date',
        'time_end'   => 'date',
    ];

    protected static function booted(): void
    {
        static::saving(function (Cv $cv) {
            $t = strtolower((string)$cv->type);
            $cv->type = in_array($t, ['education','experience'], true) ? $t : 'experience';
        });
    }

    // ========================================================================
    // Relationships
    // ========================================================================

    /**
     * Get the user that owns this CV entry
     *
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}