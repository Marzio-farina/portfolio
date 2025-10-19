<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CvResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $start = $this->time_start;
        $end   = $this->time_end;

        $years = sprintf(
            '%s — %s',
            $start ? $start->format('d/m/Y') : '?',
            $end ? $end->format('d/m/Y') : 'In Corso'
        );

        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'years'       => $years,                  // es: "28/07/2025 — 29/08/2025"
            'description' => $this->description,
            'time_start'  => $start?->toDateString(), // "YYYY-MM-DD"
            'time_end'    => $end?->toDateString(),   // "YYYY-MM-DD" | null
            'is_current'  => $end === null || $end->isFuture(),
            'type'        => $this->type,             // "education" | "experience"
        ];
    }
}