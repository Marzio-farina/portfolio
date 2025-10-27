<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Testimonial Resource
 * 
 * Transforms testimonial model data for API responses.
 * Handles both registered users and visitor testimonials.
 */
class TestimonialResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'author' => $this->getAuthorName(),
            'text' => $this->text,
            'role' => $this->role_company,
            'company' => $this->company,
            'rating' => (int) $this->rating,
            'isFromUser' => $this->isFromUser(),
            'isFromVisitor' => $this->isFromVisitor(),
            'avatar' => $this->getAvatar(),
            'icon' => $this->getIconData(), // Nuovo campo per dati icona
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }

    /**
     * Get author name from user relationship or visitor data
     * 
     * @return string
     */
    private function getAuthorName(): string
    {
        // Se ha un utente registrato, usa i dati dell'utente
        if ($this->isFromUser() && $this->user) {
            return trim(($this->user->name ?? '') . ' ' . ($this->user->surname ?? ''));
        }

        // Altrimenti usa i dati del visitatore
        return trim(($this->author_name ?? '') . ' ' . ($this->author_surname ?? ''));
    }

    /**
     * Get avatar URL from user profile or visitor data
     * 
     * @return string|null
     */
    private function getAvatar(): ?string
    {
        // Se ha un utente registrato, usa l'avatar dell'utente
        if ($this->isFromUser() && $this->user && $this->user->profile) {
            return $this->user->profile->avatar_url;
        }

        // Altrimenti usa l'avatar del visitatore (se presente)
        return $this->avatar_url;
    }

    /**
     * Get icon data for the testimonial author
     * 
     * @return array|null
     */
    private function getIconData(): ?array
    {
        // Se ha icon_id specifico (nuovo sistema)
        if ($this->icon_id && $this->icon) {
            $img = $this->icon->img;
            if ($this->isValidImagePath($img)) {
                return [
                    'id' => $this->icon->id,
                    'img' => $this->getAbsoluteUrl($img),
                    'alt' => $this->icon->alt ?? $this->getAuthorName()
                ];
            }
            // Se il path è invalido, non restituire l'icona per evitare URL monchi
            return null;
        }
        
        // Se è un utente registrato, usa la sua icona
        if ($this->isFromUser() && $this->user && $this->user->icon) {
            $img = $this->user->icon->img;
            if ($this->isValidImagePath($img)) {
                return [
                    'id' => $this->user->icon->id,
                    'img' => $this->getAbsoluteUrl($img),
                    'alt' => $this->user->icon->alt ?? $this->getAuthorName()
                ];
            }
            return null;
        }
        
        // Fallback al vecchio sistema (deprecato)
        if ($this->avatar_url) {
            return [
                'id' => null,
                'img' => $this->getAbsoluteUrl($this->avatar_url),
                'alt' => $this->getAuthorName()
            ];
        }
        
        return null;
    }

    /**
     * Verifica che il path immagine sia valido e punti a un file
     */
    private function isValidImagePath(?string $path): bool
    {
        if (!$path) return false;
        // URL assoluto: consideralo valido
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return true;
        }
        // Evita path monchi come "storage/" o "storage"
        $clean = trim($path);
        if ($clean === 'storage' || $clean === 'storage/') return false;
        // Deve contenere un nome file con estensione immagine
        return (bool) preg_match('/\.(?:jpg|jpeg|png|gif|webp)$/i', $clean);
    }

    /**
     * Convert relative path to absolute URL
     * 
     * Database path: storage/avatars/avatar-1.png
     * API returns: /storage/avatars/avatar-1.png
     * Production URL: https://api.marziofarina.it/storage/avatars/avatar-1.png
     * 
     * @param string $path
     * @return string
     */
    private function getAbsoluteUrl(string $path): string
    {
        // Se è già un URL assoluto (Supabase o altro CDN), restituiscilo così com'è
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        
        try {
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