<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

/**
 * Proxy per le chiamate all'API di GitHub
 * Permette di usare un token di autenticazione lato server
 */
class GitHubProxyController extends Controller
{
    /**
     * Ottiene le statistiche di un repository GitHub
     * 
     * @param string $owner Nome del proprietario del repository
     * @param string $repo Nome del repository
     * @return JsonResponse
     */
    public function getRepoStats(string $owner, string $repo): JsonResponse
    {
        // Usa cache per ridurre le chiamate a GitHub (cache di 1 ora)
        $cacheKey = "github_stats_{$owner}_{$repo}";
        
        $stats = Cache::remember($cacheKey, 3600, function () use ($owner, $repo) {
            try {
                $token = env('GITHUB_TOKEN'); // Token opzionale in .env
                
                // Headers per la richiesta
                $headers = [
                    'Accept' => 'application/vnd.github.v3+json',
                    'User-Agent' => 'Portfolio-App'
                ];
                
                // Aggiungi token se disponibile
                if ($token) {
                    $headers['Authorization'] = "Bearer {$token}";
                }
                
                // Ottiene info repository
                $repoResponse = Http::withHeaders($headers)
                    ->get("https://api.github.com/repos/{$owner}/{$repo}");
                
                if (!$repoResponse->successful()) {
                    return null;
                }
                
                $repoData = $repoResponse->json();
                
                // Ottiene commits (solo per contare le pagine)
                $commitsResponse = Http::withHeaders($headers)
                    ->get("https://api.github.com/repos/{$owner}/{$repo}/commits?per_page=1");
                
                $commitCount = 0;
                
                if ($commitsResponse->successful()) {
                    // Legge header Link per ottenere il conteggio totale
                    $linkHeader = $commitsResponse->header('Link');
                    
                    if ($linkHeader && preg_match('/page=(\d+)>; rel="last"/', $linkHeader, $matches)) {
                        $commitCount = (int) $matches[1];
                    } else {
                        // Se non c'è header Link, c'è solo 1 pagina (o meno di 30 commit)
                        $commits = $commitsResponse->json();
                        $commitCount = is_array($commits) ? count($commits) : 1;
                    }
                }
                
                return [
                    'name' => $repoData['name'] ?? $repo,
                    'url' => $repoData['html_url'] ?? "https://github.com/{$owner}/{$repo}",
                    'commits' => $commitCount
                ];
                
            } catch (\Exception $e) {
                \Log::error('Errore GitHub API: ' . $e->getMessage());
                return null;
            }
        });
        
        if ($stats === null) {
            return response()->json([
                'error' => 'Impossibile recuperare i dati da GitHub'
            ], 500);
        }
        
        return response()->json($stats);
    }
}

