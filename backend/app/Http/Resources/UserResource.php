<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * User Resource
 * 
 * Espone solo i dati essenziali dell'utente autenticato per POST /me
 * NON espone dati sensibili come password, tokens, ecc.
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id ?? null,
            'name' => $this->name ?? '',
            'surname' => $this->surname ?? null,
            'email' => $this->email ?? '',
            'slug' => $this->slug ?? null,
            // Solo dati essenziali per autenticazione e identificazione
            // NON esporre: password, password_hash, created_at, updated_at, tokens, ecc.
        ];
    }
}

