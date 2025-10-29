<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:100'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'L\'email è obbligatoria.',
            'email.email' => 'Inserisci un indirizzo email valido.',
            'token.required' => 'Il token di reset è obbligatorio.',
            'password.required' => 'La password è obbligatoria.',
            'password.min' => 'La password deve contenere almeno 8 caratteri.',
            'password.regex' => 'La password deve contenere almeno una maiuscola, una minuscola e un numero.',
        ];
    }
}

