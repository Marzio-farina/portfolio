<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobOfferEmail extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'subject',
        'preview',
        'direction',
        'from_address',
        'to_recipients',
        'cc_recipients',
        'bcc_recipients',
        'status',
        'sent_at',
        'message_id',
        'related_job_offer',
    ];

    protected $casts = [
        'to_recipients' => 'array',
        'cc_recipients' => 'array',
        'bcc_recipients' => 'array',
        'sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

