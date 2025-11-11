<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Autorizzazione delegata al middleware auth:sanctum
    }

    public function rules(): array
    {
        return [
            // Campi su users
            'name'          => ['sometimes','required','string','max:255'], // Il nome è obbligatorio se presente
            'surname'       => ['nullable','string','max:255'],
            'date_of_birth' => ['nullable','date','before_or_equal:' . now()->subYears(8)->format('Y-m-d')],
            
            // Campi su profiles
            'title'         => ['nullable','string','max:255'],
            'headline'      => ['nullable','string','max:255'],
            'bio'           => ['nullable','string'],
            'phone'         => ['nullable','string','max:20','regex:/^\+?[0-9\s\-()]{8,20}$/'],
            'location'      => ['nullable','string','max:100'],
            'location_url'  => ['nullable','url','max:500'],
            'avatar_url'    => ['nullable','url','max:500'],
            'icon_id'       => ['nullable','integer','exists:icons,id'],
        ];
    }
    
    public function messages(): array
    {
        return [
            'date_of_birth.before_or_equal' => 'La data di nascita deve essere almeno 8 anni fa.',
            'phone.regex' => 'Il numero di telefono non è valido. Usa un formato come: +39 123 456 7890',
        ];
    }
}
