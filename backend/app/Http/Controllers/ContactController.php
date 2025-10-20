<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Mail\ContactFormSubmitted;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function send(ContactRequest $request): JsonResponse
    {
        $data = $request->validated();

        // honeypot: se compilato, fingi ok ma non inviare
        if (!empty($data['website'])) {
            return response()->json(['ok' => true], 200);
        }

        Mail::to(config('mail.contact_to', env('CONTACT_TO')))
            ->send(new ContactFormSubmitted($data));

        return response()->json(['ok' => true], 201);
    }
}