<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobOffer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class JobOfferController extends Controller
{
    /**
     * Display a listing of the authenticated user's job offers.
     * Escludi i record con status 'search' (offerte da ricerca scraping)
     */
    public function index(): JsonResponse
    {
        $jobOffers = JobOffer::where('user_id', Auth::id())
            ->where('status', '!=', 'search')
            ->orderBy('application_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($jobOffers);
    }

    /**
     * Get statistics for visible card types
     */
    public function getStats(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'visible_types' => 'required|array',
            'visible_types.*' => 'required|string|in:total,pending,interview,accepted,archived,email'
        ]);

        $userId = Auth::id();
        $visibleTypes = $validated['visible_types'];

        // Calcola le statistiche
        $stats = [
            'total' => 0,
            'pending' => 0,
            'interview' => 0,
            'accepted' => 0,
            'archived' => 0,
            'emailSent' => 0,
        ];

        // Solo se il tipo è visibile, calcola la statistica (escludi status 'search')
        if (in_array('total', $visibleTypes)) {
            $stats['total'] = JobOffer::where('user_id', $userId)
                ->where('status', '!=', 'search')
                ->count();
        }

        if (in_array('pending', $visibleTypes)) {
            $stats['pending'] = JobOffer::where('user_id', $userId)
                ->where('status', 'pending')
                ->count();
        }

        if (in_array('interview', $visibleTypes)) {
            $stats['interview'] = JobOffer::where('user_id', $userId)
                ->where('status', 'interview')
                ->count();
        }

        if (in_array('accepted', $visibleTypes)) {
            $stats['accepted'] = JobOffer::where('user_id', $userId)
                ->where('status', 'accepted')
                ->count();
        }

        if (in_array('archived', $visibleTypes)) {
            $stats['archived'] = JobOffer::where('user_id', $userId)
                ->where('status', 'archived')
                ->count();
        }

        if (in_array('email', $visibleTypes)) {
            // Per ora emailSent rimane 0, potrebbe essere implementato in futuro
            $stats['emailSent'] = 0;
        }

        return response()->json($stats);
    }

    /**
     * Store a newly created job offer.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'recruiter_company' => 'nullable|string|max:255',
            'position' => 'required|string|max:255',
            'work_mode' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'announcement_date' => 'nullable|date',
            'application_date' => 'nullable|date',
            'website' => 'nullable|string|max:255',
            'is_registered' => 'boolean',
            'status' => ['required', Rule::in(['pending', 'interview', 'accepted', 'rejected', 'archived', 'search'])],
            'salary_range' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $validated['user_id'] = Auth::id();

        $jobOffer = JobOffer::create($validated);

        return response()->json($jobOffer, 201);
    }

    /**
     * Display the specified job offer.
     */
    public function show(JobOffer $jobOffer): JsonResponse
    {
        // Assicura che l'utente possa vedere solo le proprie job offers
        if ($jobOffer->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($jobOffer);
    }

    /**
     * Update the specified job offer.
     */
    public function update(Request $request, JobOffer $jobOffer): JsonResponse
    {
        // Assicura che l'utente possa modificare solo le proprie job offers
        if ($jobOffer->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'company_name' => 'sometimes|required|string|max:255',
            'recruiter_company' => 'nullable|string|max:255',
            'position' => 'sometimes|required|string|max:255',
            'work_mode' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'announcement_date' => 'nullable|date',
            'application_date' => 'nullable|date',
            'website' => 'nullable|string|max:255',
            'is_registered' => 'boolean',
            'status' => ['sometimes', 'required', Rule::in(['pending', 'interview', 'accepted', 'rejected', 'archived', 'search'])],
            'salary_range' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $jobOffer->update($validated);

        return response()->json($jobOffer);
    }

    /**
     * Remove the specified job offer.
     */
    public function destroy(JobOffer $jobOffer): JsonResponse
    {
        // Assicura che l'utente possa eliminare solo le proprie job offers
        if ($jobOffer->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $jobOffer->delete();

        return response()->json(['message' => 'Job offer deleted successfully']);
    }

    /**
     * Save scraped job offers with status 'search'
     */
    public function saveScrapedJobs(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'jobs' => 'required|array',
            'jobs.*.company' => 'required|string|max:255',
            'jobs.*.title' => 'required|string|max:255',
            'jobs.*.location' => 'nullable|string|max:255',
            'jobs.*.url' => 'nullable|string|max:255',
            'jobs.*.salary' => 'nullable|string|max:255',
            'jobs.*.employment_type' => 'nullable|string|max:255',
            'jobs.*.remote' => 'nullable|string|max:255',
        ]);

        $userId = Auth::id();
        $savedJobs = [];
        $skippedCount = 0;

        foreach ($validated['jobs'] as $jobData) {
            // Verifica se l'offerta esiste già (stesso URL o stessa company+title)
            $existingJob = JobOffer::where('user_id', $userId)
                ->where(function ($query) use ($jobData) {
                    if (!empty($jobData['url'])) {
                        $query->where('website', $jobData['url']);
                    } else {
                        $query->where('company_name', $jobData['company'])
                              ->where('position', $jobData['title']);
                    }
                })
                ->first();

            if (!$existingJob) {
                $jobOffer = JobOffer::create([
                    'user_id' => $userId,
                    'company_name' => $jobData['company'],
                    'position' => $jobData['title'],
                    'location' => $jobData['location'] ?? null,
                    'website' => $jobData['url'] ?? null,
                    'salary_range' => $jobData['salary'] ?? null,
                    'work_mode' => $jobData['remote'] ?? null,
                    'status' => 'search',
                    'is_registered' => 0,
                ]);

                $savedJobs[] = $jobOffer;
            } else {
                $skippedCount++;
            }
        }

        \Log::info("💾 Salvataggio offerte: " . count($savedJobs) . " nuove, {$skippedCount} duplicate skippate");

        return response()->json([
            'success' => true,
            'saved_count' => count($savedJobs),
            'skipped_count' => $skippedCount,
            'jobs' => $savedJobs
        ], 201);
    }

    /**
     * Recupera tutte le offerte scrapate (status = 'search') dell'utente autenticato
     * Utilizzato per la cronologia delle ricerche
     */
    public function getSearchHistory(): JsonResponse
    {
        $jobOffers = JobOffer::where('user_id', Auth::id())
            ->where('status', 'search')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($jobOffers);
    }
}

