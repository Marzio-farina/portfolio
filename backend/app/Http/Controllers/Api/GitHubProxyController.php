<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

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
                Log::info("[GitHubProxy] Richiesta stats per {$owner}/{$repo}");
                $token = env('GITHUB_TOKEN'); // Token opzionale in .env
                Log::info("[GitHubProxy] Token presente: " . ($token ? 'SI' : 'NO'));
                
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
                Log::info("[GitHubProxy] Chiamata API: https://api.github.com/repos/{$owner}/{$repo}");
                $repoResponse = Http::withHeaders($headers)
                    ->get("https://api.github.com/repos/{$owner}/{$repo}");
                
                Log::info("[GitHubProxy] Risposta repo - Status: " . $repoResponse->status());
                
                if (!$repoResponse->successful()) {
                    Log::error("[GitHubProxy] Errore repo response: " . $repoResponse->body());
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
                Log::error('[GitHubProxy] Errore GitHub API: ' . $e->getMessage());
                Log::error('[GitHubProxy] Stack trace: ' . $e->getTraceAsString());
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

    /**
     * Ottiene il totale di commit di tutti i repository pubblici di un utente GitHub
     * 
     * @param string $username Username GitHub dell'utente
     * @return JsonResponse
     */
    public function getUserTotalCommits(string $username): JsonResponse
    {
        // Usa cache per ridurre le chiamate a GitHub (cache di 30 minuti)
        $cacheKey = "github_user_total_commits_{$username}";
        
        $totalCommits = Cache::remember($cacheKey, 1800, function () use ($username) {
            try {
                $token = env('GITHUB_TOKEN');
                
                $headers = [
                    'Accept' => 'application/vnd.github.v3+json',
                    'User-Agent' => 'Portfolio-App'
                ];
                
                if ($token) {
                    $headers['Authorization'] = "Bearer {$token}";
                }
                
                // Ottiene tutti i repository pubblici dell'utente
                $reposResponse = Http::withHeaders($headers)
                    ->get("https://api.github.com/users/{$username}/repos?per_page=100&type=owner");
                
                if (!$reposResponse->successful()) {
                    return null;
                }
                
                $repos = $reposResponse->json();
                $totalCommits = 0;
                
                // Per ogni repository, ottiene il numero di commit
                foreach ($repos as $repo) {
                    $repoName = $repo['name'];
                    
                    // Chiamata per ottenere i commit
                    $commitsResponse = Http::withHeaders($headers)
                        ->get("https://api.github.com/repos/{$username}/{$repoName}/commits?per_page=1");
                    
                    if ($commitsResponse->successful()) {
                        $linkHeader = $commitsResponse->header('Link');
                        
                        if ($linkHeader && preg_match('/page=(\d+)>; rel="last"/', $linkHeader, $matches)) {
                            $totalCommits += (int) $matches[1];
                        } else {
                            $commits = $commitsResponse->json();
                            $totalCommits += is_array($commits) ? count($commits) : 1;
                        }
                    }
                }
                
                return $totalCommits;
                
            } catch (\Exception $e) {
                Log::error('Errore GitHub API (user commits): ' . $e->getMessage());
                return null;
            }
        });
        
        if ($totalCommits === null) {
            return response()->json([
                'error' => 'Impossibile recuperare i dati da GitHub'
            ], 500);
        }
        
        return response()->json([
            'total_commits' => $totalCommits
        ]);
    }
}

