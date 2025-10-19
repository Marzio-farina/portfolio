<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use App\Http\Resources\ProjectResource;

class ProjectController extends Controller
{
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

        $paginator = $query->paginate($perPage);

        return ProjectResource::collection($paginator)->additional([
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }
}