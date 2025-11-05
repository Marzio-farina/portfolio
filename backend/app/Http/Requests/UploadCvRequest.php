<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

/**
 * Upload CV Request
 * 
 * Validazione robusta per upload file CV (PDF)
 */
class UploadCvRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Solo utenti autenticati possono caricare CV
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'cv' => [
                'required',
                'file',
                'mimes:pdf',
                'max:10240', // 10MB
                function ($attribute, $value, $fail) {
                    if (!$this->isValidPdf($value)) {
                        $fail('Il file non è un PDF valido o contiene contenuto sospetto.');
                    }
                },
            ],
            'title' => [
                'nullable',
                'string',
                'max:100',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'cv.required' => 'Il file CV è obbligatorio.',
            'cv.file' => 'Il CV deve essere un file valido.',
            'cv.mimes' => 'Il CV deve essere in formato PDF.',
            'cv.max' => 'Il CV non può superare 10MB.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('title')) {
            $this->merge([
                'title' => strip_tags($this->title),
            ]);
        }
    }

    /**
     * Verifica che il file sia davvero un PDF valido
     */
    private function isValidPdf($file): bool
    {
        if (!$file || !$file->isValid()) {
            return false;
        }

        try {
            // Verifica magic bytes del PDF (%PDF-)
            $handle = fopen($file->getRealPath(), 'rb');
            $header = fread($handle, 5);
            fclose($handle);

            if ($header !== '%PDF-') {
                Log::warning('File non è un PDF valido (magic bytes mancanti)', [
                    'filename' => $file->getClientOriginalName(),
                    'header' => bin2hex($header)
                ]);
                return false;
            }

            // Verifica MIME type
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file->getRealPath());
            finfo_close($finfo);

            if ($mimeType !== 'application/pdf') {
                Log::warning('MIME type non corrisponde a PDF', [
                    'detected' => $mimeType
                ]);
                return false;
            }

            return true;

        } catch (\Exception $e) {
            Log::error('Errore validazione PDF', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}

