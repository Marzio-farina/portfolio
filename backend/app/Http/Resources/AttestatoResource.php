<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AttestatoResource extends JsonResource
{
    public function toArray($request)
    {
        // Il poster è un path relativo da servire tramite storage locale
        $path = (string) $this->poster;
        
        // Se il path è già un URL completo, usa quello
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            $imgUrl = $path;
        } else {
            // Costruisci l'URL usando lo storage locale
            $scheme = $request->header('x-forwarded-proto', $request->getScheme());
            $base   = $scheme.'://'.$request->getHttpHost();
            
            // Encode sicuro segmento-per-segmento
            $encoded = implode('/', array_map('rawurlencode', explode('/', ltrim($path, '/'))));
            
            // Le immagini sono servite tramite /storage/ (gestito da vercel.json)
            $imgUrl = rtrim($base, '/') . '/storage/' . $encoded;
        }

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
                'placeholder'=> $this->poster_lqip, // dataURL LQIP già calcolato dall'observer (se presente)
                'width'  => $this->poster_w,
                'height' => $this->poster_h,
            ],
        ];
    }
}