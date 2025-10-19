<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TestimonialResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'      => (string) $this->id,
            'author'  => $this->author ?? ($this->user->name ?? null),
            'text'    => $this->text,
            'role'    => $this->role_company,   // mappa sul nome che usi nel FE
            'company' => $this->company,
            'rating'  => (int) $this->rating,
        ];
    }
}