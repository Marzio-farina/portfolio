<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Job Offer Email Resource
 * 
 * Espone solo i dati essenziali dell'email legata a una candidatura.
 */
class JobOfferEmailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subject' => $this->subject,
            'preview' => $this->preview,
            'direction' => $this->direction,
            'from_address' => $this->from_address,
            'to_recipients' => $this->to_recipients ?? [],
            'cc_recipients' => $this->cc_recipients ?? [],
            'bcc_recipients' => $this->bcc_recipients ?? [],
            'status' => $this->status,
            'sent_at' => $this->sent_at?->toIso8601String(),
            'message_id' => $this->message_id,
            'related_job_offer' => $this->related_job_offer,
            'has_bcc' => !empty($this->bcc_recipients),
            'bcc_count' => $this->bcc_recipients ? count($this->bcc_recipients) : 0,
            // Solo campi usati nel frontend (non user_id, created_at, updated_at, ecc.)
        ];
    }
}

