<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttestatoResource;
use App\Models\Attestato;
use Illuminate\Http\Request;

class AttestatiController extends Controller
{
    /**
     * GET /api/attestati
     * Query param support:
     * - page (default 1)
     * - per_page (default 12, max 100)
     * - status=published|draft (default published)
     * - featured=true/false
     * - user_id=… (se non usi auth; se usi auth, prendi $request->user()->id)
     * - search (match title/issuer)
     * - sort: issued_at_desc (default) | issued_at_asc | sort_order_desc | sort_order_asc
     */
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 12), 1), 100);
        $status  = $request->query('status', 'published');
        $featured = $request->boolean('featured', null);
        $search   = $request->query('search');

        // Se hai auth API: $userId = $request->user()->id;
        $userId = $request->query('user_id'); // oppure fissalo se è un portfolio single-tenant

        $q = Attestato::query()
            ->when($userId, fn($qq) => $qq->where('user_id', $userId))
            ->when($status, fn($qq) => $qq->where('status', $status))
            ->when(!is_null($featured), fn($qq) => $qq->where('is_featured', $featured))
            ->when($search, function ($qq) use ($search) {
                $qq->where(function ($w) use ($search) {
                    $w->where('title', 'ILIKE', "%{$search}%")
                      ->orWhere('issuer', 'ILIKE', "%{$search}%");
                });
            });

        // ordinamento
        $sort = $request->query('sort', 'issued_at_desc');
        match ($sort) {
            'issued_at_asc'   => $q->orderBy('issued_at', 'asc')->orderBy('id','desc'),
            'sort_order_asc'  => $q->orderBy('sort_order', 'asc')->orderBy('issued_at','desc'),
            'sort_order_desc' => $q->orderBy('sort_order', 'desc')->orderBy('issued_at','desc'),
            default           => $q->orderBy('issued_at', 'desc')->orderBy('id','desc'),
        };

        $paginator = $q->paginate($perPage)->appends($request->query());

        return AttestatoResource::collection($paginator);
    }
}