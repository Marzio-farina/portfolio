<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobOfferColumn;
use App\Models\UserJobOfferColumn;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class JobOfferColumnController extends Controller
{
    /**
     * Get user's configured columns for job offers table
     * If user has no configuration, returns all columns with default visibility
     */
    public function index(): JsonResponse
    {
        $userId = Auth::id();
        
        // Controlla se l'utente ha già una configurazione
        $userHasConfig = UserJobOfferColumn::where('user_id', $userId)->exists();
        
        if (!$userHasConfig) {
            // Prima volta: crea configurazione di default per l'utente
            $allColumns = JobOfferColumn::orderBy('default_order')->get();
            
            // Colonne visibili di default (4 colonne essenziali)
            $defaultVisibleColumns = ['company_name', 'position', 'application_date', 'status'];
            
            foreach ($allColumns as $column) {
                UserJobOfferColumn::create([
                    'user_id' => $userId,
                    'job_offer_column_id' => $column->id,
                    'visible' => in_array($column->field_name, $defaultVisibleColumns),
                    'order' => $column->default_order
                ]);
            }
        }
        
        // Recupera le colonne con la configurazione utente
        $columns = Auth::user()->jobOfferColumns()
            ->select('job_offer_columns.*', 'user_job_offer_columns.visible', 'user_job_offer_columns.order')
            ->get()
            ->map(function ($column) {
                return [
                    'id' => $column->id,
                    'title' => $column->title,
                    'field_name' => $column->field_name,
                    'default_order' => $column->default_order,
                    'visible' => (bool) $column->pivot->visible,
                    'order' => $column->pivot->order,
                ];
            });

        return response()->json($columns);
    }

    /**
     * Update column visibility for authenticated user
     */
    public function update(Request $request, int $columnId): JsonResponse
    {
        $validated = $request->validate([
            'visible' => 'required|boolean',
        ]);

        $userId = Auth::id();

        $userColumn = UserJobOfferColumn::where('user_id', $userId)
            ->where('job_offer_column_id', $columnId)
            ->firstOrFail();

        $userColumn->update(['visible' => $validated['visible']]);

        // Ritorna la colonna aggiornata
        $column = JobOfferColumn::find($columnId);
        
        return response()->json([
            'id' => $column->id,
            'title' => $column->title,
            'field_name' => $column->field_name,
            'default_order' => $column->default_order,
            'visible' => (bool) $userColumn->visible,
            'order' => $userColumn->order,
        ]);
    }

    /**
     * Update columns order for authenticated user
     */
    public function updateOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'columns' => 'required|array',
            'columns.*.id' => 'required|integer|exists:job_offer_columns,id',
            'columns.*.order' => 'required|integer',
        ]);

        $userId = Auth::id();

        DB::transaction(function () use ($validated, $userId) {
            foreach ($validated['columns'] as $columnData) {
                UserJobOfferColumn::where('user_id', $userId)
                    ->where('job_offer_column_id', $columnData['id'])
                    ->update(['order' => $columnData['order']]);
            }
        });

        return response()->json(['message' => 'Column order updated successfully']);
    }
}

