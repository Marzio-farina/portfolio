<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Job Offer Resource
 * 
 * Espone solo i dati essenziali della job offer usati nel frontend.
 * Esclude campi non utilizzati dalle viste.
 */
class JobOfferResource extends JsonResource
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
            'user_id' => $this->user_id,
            'company_name' => $this->company_name,
            'recruiter_company' => $this->recruiter_company,
            'position' => $this->position,
            'work_mode' => $this->work_mode,
            'location' => $this->location,
            'announcement_date' => $this->announcement_date?->format('Y-m-d'),
            'application_date' => $this->application_date?->format('Y-m-d'),
            'website' => $this->website,
            'is_registered' => $this->is_registered,
            'status' => $this->status,
            'salary_range' => $this->salary_range,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}

