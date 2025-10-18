<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TestimonialResource;
use App\Models\Testimonial;
use Illuminate\Http\Request;

class TestimonialController extends Controller
{
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
}