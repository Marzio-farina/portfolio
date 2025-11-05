<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Technology;
use App\Services\Factories\DataNormalizationFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Technology API Controller
 * 
 * Handles technology-related API endpoints.
 * Returns all available technologies for projects.
 */
class TechnologyController extends Controller
{
    /**
     * Get all technologies
     * 
     * Returns technologies filtered by user_id if provided.
     * Returns global technologies (user_id = null) + user-specific ones.
     * 
     * @param Request $request HTTP request with optional user_id parameter
     * @return JsonResponse List of technologies
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->query('user_id');
        
        $query = Technology::query();
        
        if ($userId) {
            // Mostra tecnologie globali (user_id = null) + tecnologie specifiche dell'utente
            $query->where(function ($q) use ($userId) {
                $q->whereNull('user_id')
                  ->orWhere('user_id', $userId);
            });
        } else {
            // Nessun filtro: mostra tutte le tecnologie
            // Oppure solo quelle globali? Dipende dai requisiti
            $query->whereNull('user_id'); // Solo globali per sicurezza
        }
        
        $technologies = $query
            ->orderBy('title')
            ->get()
            ->map(function ($technology) {
                return [
                    'id' => $technology->id,
                    'title' => $technology->title,
                    'description' => $technology->description ?? null,
                    'user_id' => $technology->user_id,
                ];
            });

        return response()->json($technologies, 200, [], JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Create a new technology
     * 
     * Creates a new technology for the authenticated user.
     * 
     * @param Request $request HTTP request with technology data
     * @return JsonResponse Created technology
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'type' => 'nullable|string|in:frontend,backend,tools',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);
        
        // Normalizza usando DataNormalizationFactory
        $validated = DataNormalizationFactory::trimAllStrings($validated);
        $validated = DataNormalizationFactory::normalizeNullableFields($validated, ['description', 'type', 'user_id']);
        
        // Usa l'user_id dal request o dall'utente autenticato
        $userId = $validated['user_id'] ?? Auth::id();
        
        // Verifica se esiste già una tecnologia con lo stesso titolo per questo utente
        $existing = Technology::where('title', $validated['title'])
            ->where(function ($q) use ($userId) {
                $q->whereNull('user_id')
                  ->orWhere('user_id', $userId);
            })
            ->first();
        
        if ($existing) {
            return response()->json([
                'ok' => true,
                'data' => [
                    'id' => $existing->id,
                    'title' => $existing->title,
                    'description' => $existing->description,
                    'user_id' => $existing->user_id,
                ],
                'message' => 'Tecnologia già esistente',
                'is_new' => false
            ], 200, [], JSON_UNESCAPED_UNICODE);
        }
        
        // Crea la nuova tecnologia (già normalizzati da DataNormalizationFactory)
        $technology = Technology::create([
            'title' => $validated['title'],
            'description' => $validated['description'],
            'type' => $validated['type'],
            'user_id' => $userId,
        ]);
        
        return response()->json([
            'ok' => true,
            'data' => [
                'id' => $technology->id,
                'title' => $technology->title,
                'description' => $technology->description,
                'user_id' => $technology->user_id,
            ],
            'message' => 'Tecnologia creata con successo',
            'is_new' => true
        ], 201, [], JSON_UNESCAPED_UNICODE);
    }
}

