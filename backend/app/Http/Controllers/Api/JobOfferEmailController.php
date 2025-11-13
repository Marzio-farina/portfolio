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
     * con supporto per pagination e infinite scroll
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Parametri di paginazione
        $perPage = min((int) $request->query('per_page', 50), 100); // Max 100 per page
        $page = (int) $request->query('page', 1);

        $query = JobOfferEmail::query()
            ->where('user_id', $user->id)
            ->orderByDesc('sent_at')
            ->orderByDesc('created_at');

        // Filtri
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

        // Filtro per categoria (PostgreSQL - uso whereRaw per campi booleani)
        if ($request->filled('category')) {
            $category = $request->query('category');
            if ($category === 'vip') {
                $query->whereRaw('is_vip = true');
            } elseif ($category === 'drafts') {
                $query->where('status', 'draft');
            } elseif ($category === 'junk') {
                $query->whereRaw('is_junk = true');
            } elseif ($category === 'trash') {
                $query->whereRaw('is_deleted = true');
            } elseif ($category === 'archive') {
                $query->whereRaw('is_archived = true');
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

        // Paginazione
        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        // Trasformazione dei dati
        $emails = $paginator->getCollection()->map(function (JobOfferEmail $email) {
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

        // Calcola statistiche SOLO alla prima pagina (risparmia query su ogni caricamento!)
        $stats = null;
        if ($page === 1) {
            // Usa una singola query aggregata ottimizzata per PostgreSQL con casting booleano corretto
            $statsResult = JobOfferEmail::where('user_id', $user->id)
                ->selectRaw("
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE direction = 'sent') as sent_direction,
                    COUNT(*) FILTER (WHERE direction = 'received') as received_direction,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent_status,
                    COUNT(*) FILTER (WHERE status = 'received') as received_status,
                    COUNT(*) FILTER (WHERE status = 'queued') as queued_status,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_status,
                    COUNT(*) FILTER (WHERE status = 'draft') as draft_status,
                    COUNT(*) FILTER (WHERE is_vip IS TRUE) as vip,
                    COUNT(*) FILTER (WHERE is_junk IS TRUE) as junk,
                    COUNT(*) FILTER (WHERE is_deleted IS TRUE) as trash,
                    COUNT(*) FILTER (WHERE is_archived IS TRUE) as archive
                ")
                ->first();
            
            $stats = [
                'total' => (int) $statsResult->total,
                'by_direction' => [
                    'sent' => (int) $statsResult->sent_direction,
                    'received' => (int) $statsResult->received_direction,
                ],
                'by_status' => [
                    'sent' => (int) $statsResult->sent_status,
                    'received' => (int) $statsResult->received_status,
                    'queued' => (int) $statsResult->queued_status,
                    'failed' => (int) $statsResult->failed_status,
                ],
                'by_category' => [
                    'vip' => (int) $statsResult->vip,
                    'drafts' => (int) $statsResult->draft_status,
                    'junk' => (int) $statsResult->junk,
                    'trash' => (int) $statsResult->trash,
                    'archive' => (int) $statsResult->archive,
                ],
                'with_bcc' => 0, // Rimosso temporaneamente per risolvere problemi con JSONB
            ];
        }

        // Risposta con metadati di paginazione e statistiche
        return response()->json([
            'data' => $emails,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'has_more' => $paginator->hasMorePages(),
            ],
            'stats' => $stats,
        ]);
    }
}

