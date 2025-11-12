<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CvResource;
use App\Models\Cv;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

        // Verifica se esiste la colonna order per ordinamento personalizzato
        $hasOrderColumn = Schema::hasColumn('curricula', 'order');
        
        // education: ordinati per 'order' se esiste, altrimenti dal più recente al più vecchio
        $educationQuery = (clone $query)->where('type', 'education');
        if ($hasOrderColumn) {
            $education = $educationQuery->orderBy('order')->get();
        } else {
            $education = $educationQuery->orderByDesc('time_start')->get();
        }

        // experience: ordinati per 'order' se esiste, altrimenti prima le correnti, poi per inizio più recente
        $experienceQuery = (clone $query)->where('type', 'experience');
        if ($hasOrderColumn) {
            $experience = $experienceQuery->orderBy('order')->get();
        } else {
            $experience = $experienceQuery
                ->orderByRaw('CASE WHEN time_end IS NULL THEN 0 ELSE 1 END ASC')
                ->orderByDesc('time_start')
                ->get();
        }

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
        try {
            $validated = $request->validate([
                'type' => 'required|in:education,experience',
                'title' => 'required|string|max:255',
                'time_start' => 'required|date',
                'time_end' => 'nullable|date',
                'description' => 'nullable|string|max:5000',
                'order' => 'nullable|integer|min:0',
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
            
            // Gestione dell'ordine - usa transazione per evitare conflitti
            DB::beginTransaction();
            
            try {
                $insertOrder = $validated['order'] ?? 0;
                
                // Incrementa l'ordine di tutti i record >= insertOrder dello stesso tipo e utente
                Cv::where('user_id', $user->id)
                    ->where('type', $validated['type'])
                    ->where('order', '>=', $insertOrder)
                    ->increment('order');
                
                // Assegna l'ordine corretto al nuovo record
                $validated['order'] = $insertOrder;
                
                $cv = Cv::create($validated);
                
                DB::commit();
                
                return response()->json([
                    'ok' => true,
                    'message' => 'Elemento CV creato con successo',
                    'data' => new CvResource($cv)
                ], 201, [], JSON_UNESCAPED_UNICODE);
                
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Errore durante creazione CV: ' . $e->getMessage());
                
                return response()->json([
                    'ok' => false,
                    'message' => 'Errore durante il salvataggio: ' . $e->getMessage()
                ], 500, [], JSON_UNESCAPED_UNICODE);
            }
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'ok' => false,
                'message' => 'Errore di validazione',
                'errors' => $e->errors()
            ], 422, [], JSON_UNESCAPED_UNICODE);
        }
    }
    
    /**
     * Aggiorna un elemento CV esistente
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'ok' => false,
                'message' => 'Non autenticato'
            ], 401);
        }
        
        $validated = $request->validate([
            'type' => 'required|in:education,experience',
            'original_title' => 'required|string',
            'original_years' => 'required|string',
            'title' => 'required|string|max:255',
            'time_start' => 'required|date',
            'time_end' => 'nullable|date',
            'description' => 'nullable|string|max:5000',
        ]);
        
        // Trova il record originale
        $cv = Cv::where('user_id', $user->id)
            ->where('type', $validated['type'])
            ->where('title', $validated['original_title'])
            ->first();
        
        if (!$cv) {
            return response()->json([
                'ok' => false,
                'message' => 'Elemento CV non trovato'
            ], 404);
        }
        
        // Aggiorna i campi
        $cv->title = $validated['title'];
        $cv->time_start = $validated['time_start'];
        $cv->time_end = $validated['time_end'];
        $cv->description = $validated['description'] ?? '';
        $cv->save();
        
        return response()->json([
            'ok' => true,
            'message' => 'Elemento CV aggiornato con successo',
            'data' => new CvResource($cv)
        ], 200, [], JSON_UNESCAPED_UNICODE);
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