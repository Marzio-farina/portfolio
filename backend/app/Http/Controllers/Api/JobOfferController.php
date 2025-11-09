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
     */
    public function index(): JsonResponse
    {
        $jobOffers = Auth::user()->jobOffers()
            ->orderBy('application_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($jobOffers);
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
            'status' => ['required', Rule::in(['pending', 'interview', 'accepted', 'rejected', 'archived'])],
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
            'status' => ['sometimes', 'required', Rule::in(['pending', 'interview', 'accepted', 'rejected', 'archived'])],
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
}

