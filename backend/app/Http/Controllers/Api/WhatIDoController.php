<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WhatIDoResource;
use App\Models\WhatIDo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class WhatIDoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Ottieni l'utente autenticato o usa il parametro user_id per visualizzazione pubblica
        $authenticatedUser = $request->user();
        $userId = $request->query('user_id');
        
        // Determina quale user_id usare:
        // 1. Se autenticato → usa l'ID dell'utente autenticato
        // 2. Altrimenti se user_id è fornito → usa quello (visualizzazione pubblica)
        // 3. Altrimenti → usa ID=1 (utente principale per visualizzazione pubblica)
        $effectiveUserId = $authenticatedUser ? $authenticatedUser->id : ($userId ?? 1);
        
        $cacheKey = 'what_i_do_v1:u'.$effectiveUserId;
        try {
            $data = Cache::remember($cacheKey, now()->addSeconds(300), function () use ($request, $effectiveUserId) {
                $q = WhatIDo::orderBy('id');
                
                // Filtra sempre per user_id
                if (Schema::hasColumn('what_i_do', 'user_id')) {
                    $q->where('user_id', $effectiveUserId);
                }
                
                $items = $q->get();
                return [
                    'items' => WhatIDoResource::collection($items)->toArray($request),
                ];
            });

            return response()->json($data, 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            $stale = Cache::get($cacheKey);
            if ($stale) {
                return response()->json($stale, 200, ['X-Data-Status' => 'stale'], JSON_UNESCAPED_UNICODE);
            }
            Log::warning('GET /api/what-i-do failed', ['class'=>get_class($e),'msg'=>$e->getMessage()]);
            return response()->json(['error' => 'Internal error'], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * Create a new "What I Do" card
     * 
     * @param Request $request HTTP request with card data
     * @return JsonResponse Created card resource
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'description' => 'required|string|max:500',
            'icon' => 'required|string|max:50',
        ]);

        try {
            // Ottieni l'utente autenticato
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'error' => 'Utente non autenticato'
                ], 401, [], JSON_UNESCAPED_UNICODE);
            }

            // Crea la nuova card
            $card = WhatIDo::create([
                'title' => $validated['title'],
                'description' => $validated['description'],
                'icon' => $validated['icon'],
                'user_id' => $user->id,
            ]);

            // Invalida la cache
            $cacheKey = 'what_i_do_v1:u' . $user->id;
            Cache::forget($cacheKey);
            
            // Invalida anche la cache senza user_id se l'utente è il principale (ID=1)
            if ($user->id === 1) {
                Cache::forget('what_i_do_v1');
            }

            return response()->json($card, 201, [], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            Log::error('POST /api/what-i-do failed', [
                'class' => get_class($e),
                'msg' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Errore durante la creazione della card'
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * Soft delete a "What I Do" card
     * 
     * @param Request $request HTTP request
     * @param int $id Card ID
     * @return JsonResponse Success response
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'error' => 'Utente non autenticato'
                ], 401, [], JSON_UNESCAPED_UNICODE);
            }

            // Trova la card
            $card = WhatIDo::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$card) {
                return response()->json([
                    'error' => 'Card non trovata o non autorizzato'
                ], 404, [], JSON_UNESCAPED_UNICODE);
            }

            // Soft delete
            $card->delete();

            // Invalida la cache
            $cacheKey = 'what_i_do_v1:u' . $user->id;
            Cache::forget($cacheKey);
            
            // Invalida anche la cache principale se l'utente è ID=1
            if ($user->id === 1) {
                Cache::forget('what_i_do_v1');
            }

            return response()->json([
                'message' => 'Card eliminata con successo'
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            Log::error('DELETE /api/what-i-do/{id} failed', [
                'class' => get_class($e),
                'msg' => $e->getMessage(),
                'id' => $id
            ]);
            
            return response()->json([
                'error' => 'Errore durante l\'eliminazione della card'
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
}