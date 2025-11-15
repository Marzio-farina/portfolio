<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Icon Resource
 * 
 * Espone solo i dati essenziali dell'icona/avatar.
 */
class IconResource extends JsonResource
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
            'img' => $this->img,
            'alt' => $this->alt,
            // Solo campi usati nel frontend (non type, created_at, updated_at, ecc.)
        ];
    }
}

