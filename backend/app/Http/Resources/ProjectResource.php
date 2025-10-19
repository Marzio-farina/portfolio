<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'description' => $this->description,
            'poster'      => $this->poster,
            'video'       => $this->video,
            'category'    => $this->whenLoaded('category', function () {
                return $this->category ? [
                    'id'   => $this->category->id,
                    'title' => $this->category->title ?? null,
                ] : null;
            }),
            'technologies' => $this->whenLoaded('technologies', function () {
                return $this->technologies
                    ? $this->technologies->map(fn ($t) => [
                        'id'   => $t->id,
                        'title' => $t->title ?? null,
                        'description' => $t->description ?? null,
                      ])
                    : [];
            }),
            'created_at'  => optional($this->created_at)->toIso8601String(),
        ];
    }
}