<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest {
  public function rules(): array {
    return [
      'name' => ['required','string','min:2','max:50'],
      'surname' => ['nullable','string','max:50'],
      'date_of_birth' => ['nullable','date'],
      'email' => ['required','email','max:100','unique:users,email'],
      'password' => ['required','string','min:8'],
      'role_id' => ['nullable','exists:roles,id'],
      'icon_id' => ['nullable','exists:icons,id'],
    ];
  }
}