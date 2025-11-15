<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * CV File Resource
 * 
 * Espone solo i dati essenziali del file CV.
 */
class CvFileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Costruisci view_url se necessario (per getDefault)
        $viewUrl = null;
        if (!empty($this->file_path)) {
            $isUrl = str_starts_with($this->file_path, 'http://') || str_starts_with($this->file_path, 'https://');
            if ($isUrl) {
                $viewUrl = $this->file_path; // URL pubblico (Supabase)
            } else {
                // Path locale pubblicato via /storage
                $viewUrl = url($this->file_path);
            }
        }

        return [
            'id' => $this->id,
            'filename' => $this->filename,
            'title' => $this->title,
            'file_size' => $this->file_size,
            'is_default' => $this->is_default ?? false,
            'download_url' => route('api.cv-files.download', ['id' => $this->id]),
            'view_url' => $viewUrl, // Solo per getDefault, null per altri endpoint
            'created_at' => $this->created_at?->toIso8601String(),
            // Solo campi usati nel frontend (non user_id, file_path completo, mime_type, ecc.)
        ];
    }
}

