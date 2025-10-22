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
     * Query:
     * - page (default 1)
     * - per_page (default 12, max 100)
     * - status=published|draft|all  (default published)
     * - featured=true|false         (se assente: nessun filtro)
     * - user_id=...
     * - search (match title/issuer, case-insensitive, portable)
     * - sort: issued_at_desc (default) | issued_at_asc | sort_order_desc | sort_order_asc
     */
    public function index(Request $request)
    {
        // Paginazione
        $perPage = (int) $request->query('per_page', 12);
        $perPage = max(1, min(100, $perPage));

        // Filtri base
        $status   = $request->query('status', 'published'); // published|draft|all
        $userId   = $request->query('user_id');

        // featured: NON usare Request::boolean() per avere "null" quando manca
        $featuredParam = $request->query('featured', null);
        $featured = null;
        if (!is_null($featuredParam)) {
            $val = strtolower((string)$featuredParam);
            $featured = in_array($val, ['1','true','yes','on'], true) ? true
                      : (in_array($val, ['0','false','no','off'], true) ? false : null);
        }

        $q = Attestato::query();

        if ($userId) {
            $q->where('user_id', $userId);
        }

        if ($status !== 'all') {
            $q->where('status', $status);
        }

        if (!is_null($featured)) {
            $q->where('is_featured', $featured);
        }

        // Ricerca case-insensitive e "portable" (MySQL/Postgres)
        if ($search = $request->query('search')) {
            $s = mb_strtolower($search);
            $q->where(function ($w) use ($s) {
                $w->whereRaw('LOWER(title)  LIKE ?', ["%{$s}%"])
                  ->orWhereRaw('LOWER(issuer) LIKE ?', ["%{$s}%"]);
            });
        }

        // Ordinamento
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