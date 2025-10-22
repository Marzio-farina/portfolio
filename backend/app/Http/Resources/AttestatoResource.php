<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AttestatoResource extends JsonResource
{
    public function toArray($request)
    {
        // Esempio: "attestati/1 - Boolean/poster.webp"
        $path = (string) $this->poster;

        // Encode sicuro segmento-per-segmento (spazi -> %20, ecc.)
        $encoded = implode('/', array_map('rawurlencode', explode('/', ltrim($path, '/'))));

        // Base dall’host della richiesta (funziona in dev e prod)
        // se hai configurato i proxy è https in prod, http in locale
        $scheme = $request->header('x-forwarded-proto', $request->getScheme());
        $base   = $scheme.'://'.$request->getHttpHost();

        $imgUrl = rtrim($base, '/').'/i/'.$encoded;

        return [
            'id'       => $this->id,
            'title'    => $this->title,
            'issuer'   => $this->issuer,
            'date'     => optional($this->issued_at)->toDateString(),
            'badgeUrl' => $this->credential_url,
            'pdf'      => null, // se non lo usi

            'img' => [
                'alt'        => $this->poster_alt ?: $this->title,
                'src'        => $imgUrl,
                'sizes'      => '100vw',
                'placeholder'=> $this->poster_lqip, // dataURL LQIP già calcolato dall’observer (se presente)
                'width'  => $this->poster_w,
                'height' => $this->poster_h,
            ],
        ];
    }
}