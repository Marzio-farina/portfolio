<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AttestatoResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'             => $this->id,
            'title'          => $this->title,
            'issuer'         => $this->issuer,
            'issued_at'      => optional($this->issued_at)->toDateString(),
            'expires_at'     => optional($this->expires_at)->toDateString(),
            'poster'         => $this->poster,
            'credential_id'  => $this->credential_id,
            'credential_url' => $this->credential_url,
            'is_featured'    => (bool) $this->is_featured,
            'sort_order'     => $this->sort_order,
            // opzionali per frontend
            'description'    => $this->description,
            'created_at'     => optional($this->created_at)->toISOString(),
            'updated_at'     => optional($this->updated_at)->toISOString(),
        ];
    }
}