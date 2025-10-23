<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WhatIDoResource;
use App\Models\WhatIDo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class WhatIDoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cacheKey = 'what_i_do_v1';
        try {
            $data = Cache::remember($cacheKey, now()->addSeconds(300), function () use ($request) {
                $items = WhatIDo::orderBy('id')->get();
                return [
                    'items' => WhatIDoResource::collection($items)->toArray($request),
                ];
            });

            return response()->json($data, 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            $stale = Cache::get($cacheKey);
            if ($stale) {
                return response()->json($stale, 200, ['X-Data-Status' => 'stale'], JSON_UNESCAPED_UNICODE);
            }
            Log::warning('GET /api/what-i-do failed', ['class'=>get_class($e),'msg'=>$e->getMessage()]);
            return response()->json(['error' => 'Internal error'], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
}