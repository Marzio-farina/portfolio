<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TestimonialResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'      => (string) $this->id,
            'author'  => trim(($this->user->name ?? '').' '.($this->user->surname ?? '')) ?: 'Anonimo',
            'text'    => $this->text,
            'role'    => $this->role_company,   // mappa sul nome che usi nel FE
            'company' => $this->company,
            'rating'  => (int) $this->rating,
        ];
    }
}