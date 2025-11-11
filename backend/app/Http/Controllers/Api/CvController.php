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
        
        // Query che esclude automaticamente i soft-deleted grazie al trait SoftDeletes
        $query = Cv::query(); // Il trait SoftDeletes aggiunge automaticamente whereNull('deleted_at')
        
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
    
    /**
     * Crea un nuovo elemento CV (education o experience)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:education,experience',
            'title' => 'required|string|max:255',
            'time_start' => 'required|date',
            'time_end' => 'nullable|date|after_or_equal:time_start',
            'description' => 'nullable|string|max:5000',
        ]);
        
        // Aggiungi l'utente autenticato
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'ok' => false,
                'message' => 'Non autenticato'
            ], 401);
        }
        
        $validated['user_id'] = $user->id;
        
        $cv = Cv::create($validated);
        
        return response()->json([
            'ok' => true,
            'message' => 'Elemento CV creato con successo',
            'data' => new CvResource($cv)
        ], 201, [], JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Elimina un elemento CV identificato da type + title + years (approx)
     * Nota: years è formattato "dd/mm/yyyy — dd/mm/yyyy", va parsato per trovare le date
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'ok' => false,
                'message' => 'Non autenticato'
            ], 401);
        }
        
        $type = $request->query('type');
        $title = $request->query('title');
        $years = $request->query('years');
        
        if (!$type || !$title) {
            return response()->json([
                'ok' => false,
                'message' => 'Parametri mancanti (type, title richiesti)'
            ], 400);
        }
        
        // Cerca l'elemento CV dell'utente autenticato
        $query = Cv::where('user_id', $user->id)
            ->where('type', $type)
            ->where('title', $title);
        
        $cv = $query->first();
        
        if (!$cv) {
            return response()->json([
                'ok' => false,
                'message' => 'Elemento CV non trovato'
            ], 404);
        }
        
        $cv->delete();
        
        return response()->json([
            'ok' => true,
            'message' => 'Elemento CV eliminato con successo'
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}