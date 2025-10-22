<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserPublicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $dob = $this->date_of_birth ? $this->date_of_birth->format('Y-m-d') : null;
        $dob_it = $this->date_of_birth ? $this->date_of_birth->format('d/m/Y') : null;

        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'surname'     => $this->surname ?? null,
            'email'       => $this->email,
            'title'       => $this->profile->title ?? null,
            'bio'         => $this->profile->bio ?? null,
            'phone'       => $this->profile->phone ?? null,
            'location'    => $this->profile->location ?? null,
            'avatar_url'  => $this->profile->avatar_url ?? null,
            'date_of_birth'      => $dob,                  // ISO per logica
            'date_of_birth_it'   => $dob_it,               // formattata per UI
            'age'         => $dob ? $this->date_of_birth->age : null,
            'socials'     => SocialLinkResource::collection($this->whenLoaded('socialAccounts')),
        ];
    }
}