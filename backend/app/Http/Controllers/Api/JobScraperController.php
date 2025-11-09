<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class JobScraperController extends Controller
{
    /**
     * Scrape job offers from Adzuna API (aggregates Indeed, LinkedIn, Monster, etc.)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function scrapeAdzuna(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'keyword' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'limit' => 'nullable|integer|min:1|max:50'
        ]);

        try {
            $appId = env('ADZUNA_APP_ID');
            $appKey = env('ADZUNA_APP_KEY');

            if (!$appId || !$appKey) {
                // Usa mock data se le credenziali Adzuna non sono configurate
                Log::warning('Adzuna credentials not configured, using mock data');
                $jobs = $this->getMockAdzunaJobs($validated);
            } else {
                // Chiamata reale all'API Adzuna
                $jobs = $this->scrapeAdzunaReal($validated, $appId, $appKey);
            }

            return response()->json([
                'success' => true,
                'source' => 'adzuna',
                'jobs' => $jobs,
                'count' => count($jobs)
            ]);
        } catch (\Exception $e) {
            Log::error('Adzuna scraping error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Errore durante lo scraping di Adzuna',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Real scraping with Adzuna API
     * 
     * @param array $params
     * @param string $appId
     * @param string $appKey
     * @return array
     */
    private function scrapeAdzunaReal(array $params, string $appId, string $appKey): array
    {
        $keyword = urlencode($params['keyword']);
        $location = urlencode($params['location'] ?? '');
        $limit = $params['limit'] ?? 20;

        // Adzuna API endpoint per l'Italia
        $url = "https://api.adzuna.com/v1/api/jobs/it/search/1";

        $response = Http::get($url, [
            'app_id' => $appId,
            'app_key' => $appKey,
            'what' => $keyword,
            'where' => $location,
            'results_per_page' => $limit,
            'content-type' => 'application/json'
        ]);

        if (!$response->successful()) {
            throw new \Exception('Adzuna API error: ' . $response->body());
        }

        $data = $response->json();
        $jobs = [];

        if (isset($data['results'])) {
            foreach ($data['results'] as $result) {
                $jobs[] = [
                    'id' => 'adzuna_' . $result['id'],
                    'title' => $result['title'] ?? 'N/A',
                    'company' => $result['company']['display_name'] ?? 'N/A',
                    'location' => $result['location']['display_name'] ?? 'N/A',
                    'description' => strip_tags($result['description'] ?? ''),
                    'posted_date' => isset($result['created']) ? date('Y-m-d', strtotime($result['created'])) : date('Y-m-d'),
                    'url' => $result['redirect_url'] ?? '',
                    'salary' => $this->formatSalary($result),
                    'employment_type' => $result['contract_type'] ?? 'Full-time',
                    'remote' => 'N/A'
                ];
            }
        }

        return $jobs;
    }

    /**
     * Mock data for Adzuna jobs
     * 
     * @param array $params
     * @return array
     */
    private function getMockAdzunaJobs(array $params): array
    {
        $keyword = $params['keyword'];
        $location = $params['location'] ?? 'Italia';
        $limit = $params['limit'] ?? 20;

        $mockJobs = [];
        for ($i = 1; $i <= $limit; $i++) {
            $mockJobs[] = [
                'id' => 'adzuna_' . uniqid(),
                'title' => "{$keyword} #{$i}",
                'company' => "Company {$i} S.p.A.",
                'location' => $location,
                'description' => "Cerchiamo un {$keyword} per ampliare il nostro team. Requisiti: esperienza pregressa, problem solving, teamwork.",
                'posted_date' => now()->subDays(rand(1, 30))->format('Y-m-d'),
                'url' => "https://www.adzuna.it/details/{$i}",
                'salary' => rand(25000, 45000) . ' - ' . rand(45000, 70000) . ' EUR',
                'employment_type' => ['Full-time', 'Part-time', 'Contract'][rand(0, 2)],
                'remote' => ['Remote', 'Hybrid', 'On-site'][rand(0, 2)]
            ];
        }

        return $mockJobs;
    }

    /**
     * Format salary from Adzuna response
     * 
     * @param array $result
     * @return string
     */
    private function formatSalary(array $result): string
    {
        if (isset($result['salary_min']) && isset($result['salary_max'])) {
            return number_format($result['salary_min'], 0, ',', '.') . ' - ' . 
                   number_format($result['salary_max'], 0, ',', '.') . ' EUR';
        } elseif (isset($result['salary_min'])) {
            return 'Da ' . number_format($result['salary_min'], 0, ',', '.') . ' EUR';
        } elseif (isset($result['salary_max'])) {
            return 'Fino a ' . number_format($result['salary_max'], 0, ',', '.') . ' EUR';
        }
        
        return 'Non specificato';
    }
}

