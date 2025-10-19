<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WhatIDoResource;
use App\Models\WhatIDo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatIDoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = WhatIDo::orderBy('id')->get();

        return response()->json([
            'items' => WhatIDoResource::collection($items)->toArray($request),
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}