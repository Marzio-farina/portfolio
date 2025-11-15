<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * SocialAccount Resource
 * 
 * Espone i dati essenziali di un account social
 */
class SocialAccountResource extends JsonResource
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
            'provider' => $this->provider,
            'handle' => $this->handle ?? null,
            'url' => $this->url ?? null,
        ];
    }
}

