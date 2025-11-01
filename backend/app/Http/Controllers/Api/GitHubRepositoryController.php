<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GitHubRepository;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

/**
 * Controller per la gestione delle repository GitHub dell'utente
 */
class GitHubRepositoryController extends Controller
{
    /**
     * Ottiene tutte le repository GitHub dell'utente autenticato
     * 
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        
        if (!$user instanceof User) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $repositories = GitHubRepository::where('user_id', $user->id)
            ->orderBy('order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($repo) => [
                'id' => $repo->id,
                'owner' => $repo->owner,
                'repo' => $repo->repo,
                'url' => $repo->url,
                'order' => $repo->order,
            ]);

        return response()->json($repositories);
    }

    /**
     * Crea una nuova repository GitHub per l'utente autenticato
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        
        if (!$user instanceof User) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validator = Validator::make($request->all(), [
            'owner' => 'required|string|max:100',
            'repo' => 'required|string|max:100',
            'url' => 'required|string|max:255|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        
        // Verifica se esiste già questa repository per l'utente
        $exists = GitHubRepository::where('user_id', $user->id)
            ->where('owner', $data['owner'])
            ->where('repo', $data['repo'])
            ->exists();
        
        if ($exists) {
            return response()->json([
                'message' => 'Repository già presente'
            ], 409);
        }
        
        // Crea nuova repository
        $repository = GitHubRepository::create([
            'user_id' => $user->id,
            'owner' => $data['owner'],
            'repo' => $data['repo'],
            'url' => $data['url']
        ]);

        return response()->json([
            'id' => $repository->id,
            'owner' => $repository->owner,
            'repo' => $repository->repo,
            'url' => $repository->url,
        ], 201);
    }

    /**
     * Elimina una repository GitHub specifica
     * 
     * @param int $id ID della repository
     * @return JsonResponse
     */
    public function delete(int $id): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        
        if (!$user instanceof User) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $repository = GitHubRepository::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$repository) {
            return response()->json(['message' => 'GitHub repository not found'], 404);
        }

        $repository->delete();

        return response()->json(['message' => 'GitHub repository deleted']);
    }

    /**
     * Aggiorna l'ordine delle repository
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function updateOrder(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        
        if (!$user instanceof User) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validator = Validator::make($request->all(), [
            'order' => 'required|array',
            'order.*.id' => 'required|integer|exists:github_repositories,id',
            'order.*.order' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $orderData = $request->input('order');

        // Aggiorna l'ordine di ogni repository
        foreach ($orderData as $item) {
            GitHubRepository::where('id', $item['id'])
                ->where('user_id', $user->id) // Verifica che appartenga all'utente
                ->update(['order' => $item['order']]);
        }

        return response()->json(['message' => 'Order updated successfully']);
    }
}

