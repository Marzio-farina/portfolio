<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ContactRequest extends FormRequest
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
            'name'    => ['required', 'string', 'min:2', 'max:100'],
            'surname' => ['required', 'string', 'min:2', 'max:100'],
            'email'   => ['required', 'email', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'consent' => ['accepted'],
            'website' => ['nullable', 'string', 'max:100'], // honeypot
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'     => 'Il nome è obbligatorio.',
            'surname.required'  => 'Il cognome è obbligatorio.',
            'email.required'    => 'L\'email è obbligatoria.',
            'email.email'       => 'Inserisci un indirizzo email valido.',
            'message.required'  => 'Il messaggio non può essere vuoto.',
            'message.min'       => 'Il messaggio deve contenere almeno :min caratteri.',
            'consent.accepted'  => 'Devi acconsentire al trattamento dei dati per inviare il messaggio.',
        ];
    }
}