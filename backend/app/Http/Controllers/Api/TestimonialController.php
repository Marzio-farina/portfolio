<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TestimonialResource;
use App\Models\Testimonial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Testimonial API Controller
 * 
 * Handles testimonial-related API endpoints for the portfolio.
 * Provides paginated testimonial listings with user information.
 */
class TestimonialController extends Controller
{
    /**
     * Get paginated list of testimonials
     * 
     * Returns a paginated collection of testimonials with their associated
     * user information. Supports custom pagination parameters.
     * 
     * @param Request $request HTTP request with optional pagination parameters
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection Paginated testimonial collection
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 12);

        $query = Testimonial::query()
            ->with(['user:id,name,surname'])
            ->orderByDesc('id');

        // se vuoi la paginazione
        $paginator = $query->paginate($perPage);

        return TestimonialResource::collection($paginator)
            ->additional([
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page'     => $paginator->perPage(),
                    'total'        => $paginator->total(),
                    'last_page'    => $paginator->lastPage(),
                ],
            ]);
    }

    /**
     * Create a new testimonial from a visitor
     * 
     * Accepts testimonial data from non-registered visitors,
     * automatically captures IP address and User-Agent for future matching.
     * 
     * @param Request $request HTTP request with testimonial data
     * @return JsonResponse Created testimonial resource or validation errors
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'author_name' => 'required|string|max:100',
            'author_surname' => 'nullable|string|max:100',
            'avatar_url' => 'nullable|url|max:500',
            'text' => 'required|string|min:10|max:1000',
            'role_company' => 'nullable|string|max:150',
            'company' => 'nullable|string|max:150',
            'rating' => 'required|integer|min:1|max:5',
        ]);

        // Cattura automatica IP e User-Agent
        $testimonial = Testimonial::create([
            ...$validated,
            'user_id' => null, // Visitatori non hanno user_id
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(
            new TestimonialResource($testimonial),
            201
        );
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