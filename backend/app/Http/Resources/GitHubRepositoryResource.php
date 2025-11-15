<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * GitHub Repository Resource
 * 
 * Espone solo i dati essenziali della repository GitHub.
 */
class GitHubRepositoryResource extends JsonResource
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
            'owner' => $this->owner,
            'repo' => $this->repo,
            'url' => $this->url,
            'order' => $this->order,
            // Solo campi usati nel frontend (non user_id, created_at, updated_at, ecc.)
        ];
    }
}

