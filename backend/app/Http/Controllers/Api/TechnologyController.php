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
     * Returns a list of all technologies available for projects.
     * 
     * @param Request $request HTTP request
     * @return JsonResponse List of technologies
     */
    public function index(Request $request): JsonResponse
    {
        $technologies = Technology::query()
            ->orderBy('title')
            ->get()
            ->map(function ($technology) {
                return [
                    'id' => $technology->id,
                    'title' => $technology->title,
                    'description' => $technology->description ?? null,
                ];
            });

        return response()->json($technologies, 200, [], JSON_UNESCAPED_UNICODE);
    }
}

