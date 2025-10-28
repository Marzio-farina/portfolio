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

        // Priorità aside: icona utente (users.icon_id) -> URL profilo -> default
        $rawAvatar = null;
        if ($this->relationLoaded('icon') && $this->icon && !empty($this->icon->img)) {
            $rawAvatar = $this->icon->img;
        } elseif (!empty($this->profile->avatar_url ?? null)) {
            $rawAvatar = $this->profile->avatar_url;
        } else {
            $rawAvatar = 'storage/avatars/default-avatar.png';
        }

        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'surname'     => $this->surname ?? null,
            'email'       => $this->email,
            'title'       => $this->profile->title ?? null,
            'headline'    => $this->profile->headline ?? null,
            'bio'         => $this->profile->bio ?? null,
            'phone'       => $this->profile->phone ?? null,
            'location'    => $this->profile->location ?? null,
            'avatar_url'  => $this->getAbsoluteUrl($rawAvatar),
            'date_of_birth'      => $dob,                  // ISO per logica
            'date_of_birth_it'   => $dob_it,               // formattata per UI
            'age'         => $dob ? $this->date_of_birth->age : null,
            'socials'     => SocialLinkResource::collection($this->whenLoaded('socialAccounts')),
        ];
    }

    /**
     * Convert relative path to absolute URL
     * 
     * Database path: storage/avatars/avatar-1.png
     * API returns: /storage/avatars/avatar-1.png
     * Production URL: https://api.marziofarina.it/storage/avatars/avatar-1.png
     * 
     * @param string|null $path
     * @return string|null
     */
    private function getAbsoluteUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        // Se è già un URL assoluto, restituiscilo così com'è
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        try {
            // Normalizza eventuali vecchi path "avatars/..." a "storage/avatars/..."
            if (str_starts_with($path, 'avatars/')) {
                $path = 'storage/' . $path;
            }
            // Costruisci l'URL base dalla richiesta corrente
            $request = request();
            $scheme = $request->header('x-forwarded-proto', $request->getScheme());
            $host = $request->getHttpHost();
            $baseUrl = rtrim($scheme . '://' . $host, '/');

            // Ritorna il path così com'è nel database (/storage/avatars/...)
            $cleanPath = ltrim($path, '/');

            return $baseUrl . '/' . $cleanPath;
        } catch (\Exception $e) {
            // Fallback: usa APP_URL da .env
            $appUrl = env('APP_URL', 'https://api.marziofarina.it');
            $cleanPath = ltrim($path, '/');
            return rtrim($appUrl, '/') . '/' . $cleanPath;
        }
    }
}