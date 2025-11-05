<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

/**
 * Upload Avatar Request
 * 
 * Validazione robusta per upload avatar con controlli di sicurezza:
 * - Verifica tipo MIME reale (non solo estensione)
 * - Controllo dimensioni immagine
 * - Validazione contenuto file
 * - Sanitizzazione input
 */
class UploadAvatarRequest extends FormRequest
{
    /**
     * Determina se l'utente è autorizzato
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Regole di validazione
     */
    public function rules(): array
    {
        return [
            'avatar' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,png,jpg,webp',
                'max:2048', // 2MB
                'dimensions:min_width=50,min_height=50,max_width=4000,max_height=4000',
                // Validatore custom per verificare contenuto reale
                function ($attribute, $value, $fail) {
                    if (!$this->isValidImage($value)) {
                        $fail('Il file non è un\'immagine valida o contiene contenuto sospetto.');
                    }
                },
            ],
            'alt_text' => [
                'nullable',
                'string',
                'max:100',
                'regex:/^[a-zA-Z0-9\s\-\_àèéìòù]+$/u', // Solo caratteri sicuri
            ],
        ];
    }

    /**
     * Messaggi di errore personalizzati
     */
    public function messages(): array
    {
        return [
            'avatar.required' => 'Il file avatar è obbligatorio.',
            'avatar.image' => 'Il file deve essere un\'immagine.',
            'avatar.mimes' => 'Formato immagine non supportato. Usa: JPEG, PNG o WebP.',
            'avatar.max' => 'L\'immagine non può superare 2MB.',
            'avatar.dimensions' => 'L\'immagine deve essere tra 50x50 e 4000x4000 pixel.',
            'alt_text.max' => 'Il testo alternativo non può superare 100 caratteri.',
            'alt_text.regex' => 'Il testo alternativo contiene caratteri non consentiti.',
        ];
    }

    /**
     * Sanitizzazione input prima della validazione
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('alt_text')) {
            $this->merge([
                'alt_text' => strip_tags($this->alt_text),
            ]);
        }
    }

    /**
     * Verifica che il file sia davvero un'immagine valida
     * Controlla i magic bytes e il MIME type reale
     */
    private function isValidImage($file): bool
    {
        if (!$file || !$file->isValid()) {
            Log::warning('File upload non valido', [
                'error' => $file ? $file->getErrorMessage() : 'file null'
            ]);
            return false;
        }

        try {
            // Leggi le informazioni reali dell'immagine
            $imageInfo = @getimagesize($file->getRealPath());
            
            if ($imageInfo === false) {
                Log::warning('getimagesize fallito - non è un\'immagine valida');
                return false;
            }

            // Verifica MIME type reale (non quello dichiarato dal client)
            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!in_array($imageInfo['mime'], $allowedMimes)) {
                Log::warning('MIME type non consentito', [
                    'detected' => $imageInfo['mime'],
                    'allowed' => $allowedMimes
                ]);
                return false;
            }

            // Verifica che non contenga codice PHP nascosto
            $content = file_get_contents($file->getRealPath(), false, null, 0, 1024);
            if (preg_match('/<\?php|<\?=|<script/i', $content)) {
                Log::warning('File contiene codice sospetto', [
                    'filename' => $file->getClientOriginalName()
                ]);
                return false;
            }

            return true;

        } catch (\Exception $e) {
            Log::error('Errore validazione immagine', [
                'error' => $e->getMessage(),
                'file' => $file->getClientOriginalName()
            ]);
            return false;
        }
    }

    /**
     * Ottieni il file validato
     */
    public function getValidatedFile()
    {
        return $this->file('avatar');
    }

    /**
     * Ottieni l'alt text sanitizzato
     */
    public function getAltText(): string
    {
        return $this->validated()['alt_text'] ?? 'Avatar';
    }
}

