<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SocialLinkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'provider' => $this->provider,                 // es. github
            'handle'   => $this->handle ?? null,           // es. MarzioFarina
            'url'      => $this->url ?? null,              // es. https://github.com/...
        ];
    }
}