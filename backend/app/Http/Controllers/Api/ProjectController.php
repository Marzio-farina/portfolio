<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Project API Controller
 * 
 * Handles project-related API endpoints for the portfolio.
 * Provides paginated project listings with category and technology relationships.
 */
class ProjectController extends Controller
{
    /**
     * Get paginated list of projects
     * 
     * Returns a paginated collection of projects with their associated
     * categories and technologies. Supports custom pagination parameters.
     * 
     * @param Request $request HTTP request with optional pagination parameters
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection Paginated project collection
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 12);
        $perPage = max(1, min($perPage, 100));

        $query = Project::query()
            ->with([
                'category:id,title',            // adatta i campi esistenti
                'technologies:id,title,description'    // adatta i campi esistenti
            ])
            ->orderByDesc('id');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        // Execute paginated query
        $paginator = $query->paginate($perPage);

        // Return paginated resource collection
        return ProjectResource::collection($paginator)->additional([
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * Validate and sanitize per_page parameter
     * 
     * Ensures per_page is within acceptable bounds to prevent
     * performance issues and abuse.
     * 
     * @param mixed $perPage Raw per_page parameter
     * @return int Sanitized per_page value (1-100)
     */
    private function validatePerPage($perPage): int
    {
        $perPage = (int) $perPage;
        return max(1, min($perPage, 100));
    }
}