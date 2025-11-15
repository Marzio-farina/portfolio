<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Job Offer Card Resource
 * 
 * Espone solo i dati essenziali della card di statistiche job offers.
 */
class JobOfferCardResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Gestisce sia il caso di JobOfferCard (modello) che il caso di relazione pivot
        // Se ha pivot (relazione utente-card), usa visible dal pivot, altrimenti true (default)
        $visible = isset($this->pivot) && isset($this->pivot->visible) 
            ? (bool) $this->pivot->visible 
            : (property_exists($this->resource, 'visible') ? (bool) $this->visible : true);
        
        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type,
            'icon_svg' => $this->icon_svg,
            'visible' => $visible,
            // Solo campi usati nel frontend (non created_at, updated_at, ecc.)
        ];
    }
}

