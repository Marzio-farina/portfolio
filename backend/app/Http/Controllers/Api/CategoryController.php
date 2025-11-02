<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Category API Controller
 * 
 * Handles category-related API endpoints.
 * Returns all available categories for projects.
 */
class CategoryController extends Controller
{
    /**
     * Get all categories
     * 
     * Returns a list of all categories available for projects.
     * Filtra le categorie per user_id se specificato.
     * 
     * @param Request $request HTTP request
     * @return JsonResponse List of categories
     */
    public function index(Request $request): JsonResponse
    {
        $query = Category::query();
        
        // Filtra per user_id se specificato
        if ($request->has('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }
        
        $categories = $query
            ->orderBy('title')
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->id,
                    'title' => $category->title,
                    'description' => $category->description ?? null,
                    'user_id' => $category->user_id,
                ];
            });

        return response()->json($categories, 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Delete a category by title (soft delete)
     * 
     * Elimina una categoria in base al titolo.
     * Verifica che la categoria appartenga all'utente autenticato.
     * 
     * @param Request $request HTTP request
     * @param string $title Titolo della categoria da eliminare
     * @return JsonResponse Response indicating success or failure
     */
    public function destroyByTitle(Request $request, string $title): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'message' => 'Non autenticato'
            ], 401);
        }
        
        // Trova la categoria per titolo e user_id
        $category = Category::where('title', $title)
            ->where('user_id', $user->id)
            ->first();
        
        if (!$category) {
            return response()->json([
                'message' => 'Categoria non trovata o non autorizzato'
            ], 404);
        }
        
        // Verifica se ci sono progetti associati
        $projectCount = $category->projects()->count();
        if ($projectCount > 0) {
            return response()->json([
                'message' => "Impossibile eliminare la categoria. Ci sono {$projectCount} progetti associati."
            ], 422);
        }
        
        // Soft delete
        $category->delete();
        
        return response()->json([
            'message' => 'Categoria eliminata con successo'
        ], 200);
    }
}

