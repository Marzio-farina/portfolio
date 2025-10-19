<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CvResource;
use App\Models\Cv;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CvController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // education: dal più recente al più vecchio
        $education = Cv::query()
            ->where('type', 'education')
            ->orderByDesc('time_start')
            ->get();

        // experience: prima le correnti (time_end NULL), poi per inizio più recente
        $experience = Cv::query()
            ->where('type', 'experience')
            ->orderByRaw('CASE WHEN time_end IS NULL THEN 0 ELSE 1 END ASC')
            ->orderByDesc('time_start')
            ->get();

        return response()->json([
            'education'  => CvResource::collection($education)->toArray($request),
            'experience' => CvResource::collection($experience)->toArray($request),
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}