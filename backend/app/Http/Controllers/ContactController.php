<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Mail\ContactFormSubmitted;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ContactController extends Controller
{
    public function send(ContactRequest $request): JsonResponse
    {
        // 1) Dati validati (inclusi consent + website se presenti nelle rules)
        $data = $request->validated();

        // 2) Honeypot: se valorizzato, non inviamo ma rispondiamo OK
        if (!empty($data['website'] ?? null)) {
            Log::info('[CONTACT] honeypot triggered');
            return response()->json(['ok' => true], 200);
        }

        // 3) Destinatario: da config (fallback sicuro)
        $to = config('mail.contact_to') ?: 'test@mailtrap.io';

        // 4) Invio email
        try {
            // Se vuoi forzare l’invio RAW per debug, metti MAIL_USE_RAW=true nel .env
            if (filter_var(config('mail.use_raw', env('MAIL_USE_RAW', false)), FILTER_VALIDATE_BOOL)) {
                Mail::mailer('smtp')->raw(
                    "Messaggio dal form:\n\n".
                    "Nome: {$data['name']}\n".
                    "Cognome: {$data['surname']}\n".
                    "Email: {$data['email']}\n".
                    (!empty($data['subject']) ? "Oggetto: {$data['subject']}\n" : "").
                    "\nTesto:\n{$data['message']}\n",
                    function ($m) use ($to) {
                        $m->to($to)->subject('[CONTACT] Test invio via controller (RAW)');
                        $m->from(config('mail.from.address'), config('mail.from.name'));
                    }
                );
                Log::info('[CONTACT] mail sent (raw via smtp)');
            } else {
                // 5) Invio standard tramite Mailable
                Mail::to($to)->send(new ContactFormSubmitted($data));
                Log::info('[CONTACT] mail sent (mailable via smtp)');
            }

            return response()->json(['ok' => true], 201);
        } catch (Throwable $e) {
            Log::error('[CONTACT] mail error', [
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Mail error',
            ], 500);
        }
    }
}