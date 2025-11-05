<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Mail\ContactFormSubmitted;
use App\Services\Factories\DataNormalizationFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Contact Controller
 * 
 * Handles contact form submissions with spam protection
 * and email delivery functionality.
 */
class ContactController extends Controller
{
    /**
     * Send contact form email
     * 
     * Processes contact form data, validates against spam,
     * and sends email notification to configured recipient.
     * 
     * @param ContactRequest $request Validated contact form data
     * @return JsonResponse Success or error response
     */
    public function send(ContactRequest $request): JsonResponse
    {
        // Get validated form data
        $data = $request->validated();

        // Honeypot spam protection: if website field is filled, treat as spam
        if (!empty($data['website'] ?? null)) {
            Log::info('[CONTACT] Honeypot triggered - potential spam detected');
            return response()->json(['ok' => true], 200);
        }

        // Get recipient email from configuration
        $recipient = config('mail.contact_to') ?: 'test@mailtrap.io';

        try {
            // Send email based on configuration
            if ($this->shouldUseRawEmail()) {
                $this->sendRawEmail($data, $recipient);
            } else {
                $this->sendMailableEmail($data, $recipient);
            }

            return response()->json(['ok' => true], 201);

        } catch (Throwable $e) {
            Log::error('[CONTACT] Email sending failed', [
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Failed to send email. Please try again later.'
            ], 500);
        }
    }

    /**
     * Check if raw email sending is enabled
     * 
     * @return bool True if raw email should be used
     */
    private function shouldUseRawEmail(): bool
    {
        return filter_var(
            config('mail.use_raw', env('MAIL_USE_RAW', false)), 
            FILTER_VALIDATE_BOOL
        );
    }

    /**
     * Send email using raw format (for debugging)
     * 
     * @param array $data Contact form data
     * @param string $recipient Recipient email address
     * @return void
     */
    private function sendRawEmail(array $data, string $recipient): void
    {
        $message = $this->buildRawMessage($data);

        Mail::mailer('smtp')->raw($message, function ($mail) use ($recipient) {
            $mail->to($recipient)
                 ->subject('[CONTACT] New message from portfolio')
                 ->from(
                     config('mail.from.address'), 
                     config('mail.from.name')
                 );
        });

        Log::info('[CONTACT] Raw email sent successfully');
    }

    /**
     * Send email using Mailable class
     * 
     * @param array $data Contact form data
     * @param string $recipient Recipient email address
     * @return void
     */
    private function sendMailableEmail(array $data, string $recipient): void
    {
        Mail::to($recipient)->send(new ContactFormSubmitted($data));
        Log::info('[CONTACT] Mailable email sent successfully');
    }

    /**
     * Build raw email message content
     * 
     * @param array $data Contact form data
     * @return string Formatted email message
     */
    private function buildRawMessage(array $data): string
    {
        // Sanifica input per sicurezza
        $name = DataNormalizationFactory::sanitizeInput($data['name']);
        $surname = DataNormalizationFactory::sanitizeInput($data['surname']);
        $email = DataNormalizationFactory::sanitizeInput($data['email']);
        $subject = !empty($data['subject']) ? DataNormalizationFactory::sanitizeInput($data['subject']) : '';
        $messageText = DataNormalizationFactory::sanitizeInput($data['message']);
        
        $message = "New contact form submission:\n\n";
        $message .= "Name: {$name}\n";
        $message .= "Surname: {$surname}\n";
        $message .= "Email: {$email}\n";
        
        if (!empty($subject)) {
            $message .= "Subject: {$subject}\n";
        }
        
        $message .= "\nMessage:\n{$messageText}\n";

        return $message;
    }
}