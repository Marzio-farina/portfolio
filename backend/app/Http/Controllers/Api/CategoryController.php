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
     * 
     * @param Request $request HTTP request
     * @return JsonResponse List of categories
     */
    public function index(Request $request): JsonResponse
    {
        $categories = Category::query()
            ->orderBy('title')
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->id,
                    'title' => $category->title,
                    'description' => $category->description ?? null,
                ];
            });

        return response()->json($categories, 200, [], JSON_UNESCAPED_UNICODE);
    }
}

