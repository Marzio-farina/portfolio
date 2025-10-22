<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Testimonial Resource
 * 
 * Transforms testimonial model data for API responses.
 * Handles user relationship and provides consistent data structure.
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
        ];
    }

    /**
     * Get author name from user relationship or fallback
     * 
     * @return string|null
     */
    private function getAuthorName(): ?string
    {
        if ($this->author) {
            return $this->author;
        }

        if ($this->user) {
            return $this->user->name ?? null;
        }

        return null;
    }
}