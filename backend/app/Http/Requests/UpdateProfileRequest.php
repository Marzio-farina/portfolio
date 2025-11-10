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
            'title'         => ['nullable','string','max:255'],
            'headline'      => ['nullable','string','max:255'],
            'bio'           => ['nullable','string'],
            'phone'         => ['nullable','string','max:20'],
            'location'      => ['nullable','string','max:100'],
            'location_url'  => ['nullable','url','max:500'],
            'avatar_url'    => ['nullable','url','max:500'],
            'icon_id'       => ['nullable','integer','exists:icons,id'],
            'date_of_birth' => ['nullable','date','before_or_equal:' . now()->subYears(8)->format('Y-m-d')],
        ];
    }
    
    public function messages(): array
    {
        return [
            'date_of_birth.before_or_equal' => 'La data di nascita deve essere almeno 8 anni fa.',
        ];
    }
}
