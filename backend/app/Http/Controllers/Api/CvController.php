<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CvResource;
use App\Models\Cv;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class CvController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Opzionalmente filtra per user_id se fornito (per multi-utente)
        $userId = $request->query('user_id');
        
        $query = Cv::query();
        
        // Verifica se la colonna user_id esiste (retrocompatibilità)
        $hasUserIdColumn = Schema::hasColumn('curricula', 'user_id');
        
        if ($hasUserIdColumn) {
            if ($userId) {
                // Filtra per utente specifico
                $query->where('user_id', $userId);
            } else {
                // Se non specificato, usa l'utente principale (da ENV o default a 1)
                // Questo garantisce che sul path senza slug si vedano solo i CV dell'utente principale
                $publicUserId = (int) (env('PUBLIC_USER_ID') ?? 1);
                $query->where('user_id', $publicUserId);
            }
        }
        // Se la colonna non esiste, mostra tutti (comportamento pre-migration)

        // education: dal più recente al più vecchio
        $education = (clone $query)
            ->where('type', 'education')
            ->orderByDesc('time_start')
            ->get();

        // experience: prima le correnti (time_end NULL), poi per inizio più recente
        $experience = (clone $query)
            ->where('type', 'experience')
            ->orderByRaw('CASE WHEN time_end IS NULL THEN 0 ELSE 1 END ASC')
            ->orderByDesc('time_start')
            ->get();

        return response()->json([
            'education'  => CvResource::collection($education)->toArray($request),
            'experience' => CvResource::collection($experience)->toArray($request),
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}