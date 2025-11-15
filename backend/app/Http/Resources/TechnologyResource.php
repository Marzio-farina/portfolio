<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Technology Resource
 * 
 * Espone solo i dati essenziali della technology usati nel frontend.
 */
class TechnologyResource extends JsonResource
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
            'title' => $this->title,
            'description' => $this->description,
            'user_id' => $this->user_id,
            // Solo campi usati nel frontend (non created_at, updated_at, ecc.)
        ];
    }
}

