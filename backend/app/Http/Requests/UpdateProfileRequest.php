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
            'title'      => ['nullable','string','max:255'],
            'headline'   => ['nullable','string','max:255'],
            'bio'        => ['nullable','string'],
            'phone'      => ['nullable','string','max:20'],
            'location'   => ['nullable','string','max:100'],
            'avatar_url' => ['nullable','url','max:500'],
        ];
    }
}
