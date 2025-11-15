<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobOfferEmailColumnResource;
use App\Models\JobOfferEmailColumn;
use App\Models\UserJobOfferEmailColumn;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class JobOfferEmailColumnController extends Controller
{
    /**
     * Get user's configured columns for job offer emails table
     * If user has no configuration, returns all columns with default visibility (max 4)
     */
    public function index(): JsonResponse
    {
        $userId = Auth::id();
        
        // Controlla se l'utente ha già una configurazione
        $userHasConfig = UserJobOfferEmailColumn::where('user_id', $userId)->exists();
        
        if (!$userHasConfig) {
            // Prima volta: crea configurazione di default per l'utente
            $allColumns = JobOfferEmailColumn::orderBy('default_order')->get();
            
            // Colonne visibili di default (max 4 colonne essenziali)
            $defaultVisibleColumns = ['subject', 'direction', 'status', 'sent_at'];
            
            foreach ($allColumns as $column) {
                UserJobOfferEmailColumn::create([
                    'user_id' => $userId,
                    'job_offer_email_column_id' => $column->id,
                    'visible' => in_array($column->field_name, $defaultVisibleColumns),
                    'order' => $column->default_order
                ]);
            }
        }
        
        // Recupera le colonne con la configurazione utente, ordinate per 'order'
        $columns = Auth::user()->jobOfferEmailColumns()
            ->select('job_offer_email_columns.*', 'user_job_offer_email_columns.visible', 'user_job_offer_email_columns.order')
            ->orderBy('user_job_offer_email_columns.order')
            ->get();

        return response()->json(JobOfferEmailColumnResource::collection($columns));
    }

    /**
     * Update column visibility for authenticated user
     * Limita a massimo 4 colonne visibili
     */
    public function update(Request $request, string $columnId): JsonResponse
    {
        $validated = $request->validate([
            'visible' => 'required|boolean',
        ]);

        $userId = Auth::id();
        $columnIdInt = (int) $columnId;

        // Se si sta provando a rendere visibile una colonna
        if ($validated['visible']) {
            // Conta quante colonne sono già visibili
            $visibleCount = UserJobOfferEmailColumn::where('user_id', $userId)
                ->where('visible', true)
                ->count();
            
            // Se sono già 4, non permettere di aggiungerne altre
            if ($visibleCount >= 4) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Puoi visualizzare massimo 4 colonne alla volta'
                ], 422);
            }
        }

        $userColumn = UserJobOfferEmailColumn::where('user_id', $userId)
            ->where('job_offer_email_column_id', $columnIdInt)
            ->firstOrFail();

        $userColumn->update(['visible' => $validated['visible']]);

        // Ritorna la colonna aggiornata con configurazione utente
        $column = Auth::user()->jobOfferEmailColumns()
            ->where('job_offer_email_columns.id', $columnIdInt)
            ->select('job_offer_email_columns.*', 'user_job_offer_email_columns.visible', 'user_job_offer_email_columns.order')
            ->firstOrFail();
        
        return response()->json(new JobOfferEmailColumnResource($column));
    }

    /**
     * Update columns order for authenticated user
     */
    public function updateOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'column_ids' => 'sometimes|array',
            'column_ids.*' => 'integer|exists:job_offer_email_columns,id',
            'columns' => 'sometimes|array',
            'columns.*.id' => 'integer|exists:job_offer_email_columns,id',
            'columns.*.order' => 'integer',
        ]);

        $userId = Auth::id();

        DB::transaction(function () use ($validated, $userId) {
            // Formato con column_ids (array ordinato di IDs)
            if (isset($validated['column_ids'])) {
                foreach ($validated['column_ids'] as $index => $columnId) {
                    UserJobOfferEmailColumn::where('user_id', $userId)
                        ->where('job_offer_email_column_id', $columnId)
                        ->update(['order' => $index]);
                }
            }
            // Formato con columns array di oggetti
            else if (isset($validated['columns'])) {
                foreach ($validated['columns'] as $columnData) {
                    UserJobOfferEmailColumn::where('user_id', $userId)
                        ->where('job_offer_email_column_id', $columnData['id'])
                        ->update(['order' => $columnData['order']]);
                }
            }
        });

        // Ritorna le colonne aggiornate con il nuovo ordine
        $columns = Auth::user()->jobOfferEmailColumns()
            ->select('job_offer_email_columns.*', 'user_job_offer_email_columns.visible', 'user_job_offer_email_columns.order')
            ->orderBy('user_job_offer_email_columns.order')
            ->get();

        return response()->json(JobOfferEmailColumnResource::collection($columns));
    }
}

