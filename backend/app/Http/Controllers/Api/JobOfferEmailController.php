<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobOfferEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class JobOfferEmailController extends Controller
{
    /**
     * Restituisce la lista delle email legate alle candidature per l'utente autenticato
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $query = JobOfferEmail::query()
            ->where('user_id', $user->id)
            ->orderByDesc('sent_at')
            ->orderByDesc('created_at');

        if ($request->filled('direction') && in_array($request->query('direction'), ['sent', 'received'], true)) {
            $query->where('direction', $request->query('direction'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('has_bcc')) {
            $hasBcc = filter_var($request->query('has_bcc'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($hasBcc !== null) {
                $query->where(function ($inner) use ($hasBcc) {
                    if ($hasBcc) {
                        $inner->whereNotNull('bcc_recipients')->whereJsonLength('bcc_recipients', '>', 0);
                    } else {
                        $inner->whereNull('bcc_recipients')->orWhereJsonLength('bcc_recipients', '=', 0);
                    }
                });
            }
        }

        if ($request->filled('search')) {
            $search = strtolower($request->query('search'));
            $query->where(function ($inner) use ($search) {
                $inner->whereRaw('LOWER(subject) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(preview) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(from_address) LIKE ?', ["%{$search}%"]);
            });
        }

        $emails = $query->get()->map(function (JobOfferEmail $email) {
            return [
                'id' => $email->id,
                'subject' => $email->subject,
                'preview' => $email->preview,
                'direction' => $email->direction,
                'from_address' => $email->from_address,
                'to_recipients' => $email->to_recipients ?? [],
                'cc_recipients' => $email->cc_recipients ?? [],
                'bcc_recipients' => $email->bcc_recipients ?? [],
                'status' => $email->status,
                'sent_at' => optional($email->sent_at)->toIso8601String(),
                'message_id' => $email->message_id,
                'related_job_offer' => $email->related_job_offer,
                'has_bcc' => !empty($email->bcc_recipients),
                'bcc_count' => $email->bcc_recipients ? count($email->bcc_recipients) : 0,
            ];
        });

        return response()->json($emails);
    }
}

