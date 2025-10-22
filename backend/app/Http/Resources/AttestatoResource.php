<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AttestatoResource extends JsonResource
{
    public function toArray($request)
    {
        $path = $this->poster; // es.: "attestati/1 - Boolean/poster.webp"

        return [
            'id'       => $this->id,
            'title'    => $this->title,
            'issuer'   => $this->issuer,
            'date'     => optional($this->issued_at)->toDateString(),
            'badgeUrl' => $this->credential_url,
            'pdf'      => null, // se non lo usi

            'img' => [
                'alt'        => $this->poster_alt ?: $this->title,
                'src'        => route('img.show', ['path' => $path]), // 👈 originale via proxy
                'sizes'      => '100vw',
                'placeholder'=> $this->poster_lqip, // dataURL LQIP già calcolato dall’observer (se presente)
                'width'  => $this->poster_w,
                'height' => $this->poster_h,
            ],
        ];
    }
}