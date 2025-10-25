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
}