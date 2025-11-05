<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Log;

/**
 * Regola di validazione custom per immagini
 * 
 * Verifica che il file sia effettivamente un'immagine valida
 * controllando i magic bytes e il contenuto reale
 */
class ValidImage implements ValidationRule
{
    private array $allowedMimes;
    private bool $checkForCode;

    public function __construct(
        array $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'],
        bool $checkForCode = true
    ) {
        $this->allowedMimes = $allowedMimes;
        $this->checkForCode = $checkForCode;
    }

    /**
     * Esegui la validazione
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!$value || !method_exists($value, 'isValid') || !$value->isValid()) {
            $fail('Il file non è valido.');
            return;
        }

        try {
            // Leggi le informazioni reali dell'immagine
            $imageInfo = @getimagesize($value->getRealPath());
            
            if ($imageInfo === false) {
                Log::warning('getimagesize fallito', [
                    'file' => $value->getClientOriginalName()
                ]);
                $fail('Il file non è un\'immagine valida.');
                return;
            }

            // Verifica MIME type reale
            if (!in_array($imageInfo['mime'], $this->allowedMimes)) {
                Log::warning('MIME type non consentito', [
                    'detected' => $imageInfo['mime'],
                    'allowed' => $this->allowedMimes,
                    'file' => $value->getClientOriginalName()
                ]);
                $fail('Tipo di immagine non supportato.');
                return;
            }

            // Verifica che non contenga codice pericoloso
            if ($this->checkForCode) {
                $content = file_get_contents($value->getRealPath(), false, null, 0, 1024);
                if (preg_match('/<\?php|<\?=|<script|<iframe/i', $content)) {
                    Log::warning('File contiene codice sospetto', [
                        'file' => $value->getClientOriginalName()
                    ]);
                    $fail('Il file contiene contenuto non consentito.');
                    return;
                }
            }

        } catch (\Exception $e) {
            Log::error('Errore validazione immagine', [
                'error' => $e->getMessage(),
                'file' => $value->getClientOriginalName()
            ]);
            $fail('Errore durante la validazione dell\'immagine.');
        }
    }
}

