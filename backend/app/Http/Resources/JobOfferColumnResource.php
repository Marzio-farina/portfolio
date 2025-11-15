<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Job Offer Column Resource
 * 
 * Espone solo i dati essenziali della colonna configurata dall'utente per la tabella job offers.
 */
class JobOfferColumnResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Gestisce sia il caso di JobOfferColumn (modello) che il caso di relazione pivot
        return [
            'id' => $this->id,
            'title' => $this->title,
            'field_name' => $this->field_name,
            'default_order' => $this->default_order,
            'visible' => isset($this->pivot) ? (bool) $this->pivot->visible : (bool) $this->visible,
            'order' => isset($this->pivot) ? $this->pivot->order : $this->order,
            // Solo campi usati nel frontend (non created_at, updated_at, ecc.)
        ];
    }
}

