<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Technology;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}

