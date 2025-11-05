<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Log;

/**
 * Regola di validazione custom per PDF
 * 
 * Verifica che il file sia effettivamente un PDF valido
 * controllando i magic bytes
 */
class ValidPdf implements ValidationRule
{
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
            // Verifica magic bytes del PDF (%PDF-)
            $handle = fopen($value->getRealPath(), 'rb');
            $header = fread($handle, 5);
            fclose($handle);

            if ($header !== '%PDF-') {
                Log::warning('File non è un PDF valido', [
                    'file' => $value->getClientOriginalName(),
                    'header' => bin2hex($header)
                ]);
                $fail('Il file non è un PDF valido.');
                return;
            }

            // Verifica MIME type
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $value->getRealPath());
            finfo_close($finfo);

            if ($mimeType !== 'application/pdf') {
                Log::warning('MIME type non corrisponde a PDF', [
                    'detected' => $mimeType,
                    'file' => $value->getClientOriginalName()
                ]);
                $fail('Il file non è un PDF valido.');
                return;
            }

        } catch (\Exception $e) {
            Log::error('Errore validazione PDF', [
                'error' => $e->getMessage(),
                'file' => $value->getClientOriginalName()
            ]);
            $fail('Errore durante la validazione del PDF.');
        }
    }
}

