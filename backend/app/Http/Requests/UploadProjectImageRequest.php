<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

/**
 * Upload Project Image Request
 * 
 * Validazione robusta per upload immagini progetti
 */
class UploadProjectImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,png,jpg,webp',
                'max:5120', // 5MB per immagini progetti (più grandi degli avatar)
                'dimensions:min_width=100,min_height=100,max_width=4000,max_height=4000',
                function ($attribute, $value, $fail) {
                    if (!$this->isValidImage($value)) {
                        $fail('Il file non è un\'immagine valida o contiene contenuto sospetto.');
                    }
                },
            ],
            'alt_text' => [
                'nullable',
                'string',
                'max:200',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'L\'immagine del progetto è obbligatoria.',
            'image.image' => 'Il file deve essere un\'immagine.',
            'image.mimes' => 'Formato immagine non supportato. Usa: JPEG, PNG o WebP.',
            'image.max' => 'L\'immagine non può superare 5MB.',
            'image.dimensions' => 'L\'immagine deve essere tra 100x100 e 4000x4000 pixel.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('alt_text')) {
            $this->merge([
                'alt_text' => strip_tags($this->alt_text),
            ]);
        }
    }

    private function isValidImage($file): bool
    {
        if (!$file || !$file->isValid()) {
            return false;
        }

        try {
            $imageInfo = @getimagesize($file->getRealPath());
            
            if ($imageInfo === false) {
                return false;
            }

            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!in_array($imageInfo['mime'], $allowedMimes)) {
                return false;
            }

            // Controlla contenuto sospetto
            $content = file_get_contents($file->getRealPath(), false, null, 0, 1024);
            if (preg_match('/<\?php|<\?=|<script/i', $content)) {
                Log::warning('File contiene codice sospetto', [
                    'filename' => $file->getClientOriginalName()
                ]);
                return false;
            }

            return true;

        } catch (\Exception $e) {
            Log::error('Errore validazione immagine progetto', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}

