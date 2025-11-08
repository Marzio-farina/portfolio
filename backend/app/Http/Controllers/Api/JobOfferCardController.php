<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobOfferCard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class JobOfferCardController extends Controller
{
    /**
     * Restituisce tutte le card dell'utente autenticato con la configurazione di visibilità
     */
    public function index()
    {
        $user = Auth::user();
        
        // Ottieni le card con il pivot visible
        $cards = $user->jobOfferCards()
            ->orderBy('job_offer_cards.id', 'asc')
            ->get()
            ->map(function ($card) {
                return [
                    'id' => $card->id,
                    'title' => $card->title,
                    'type' => $card->type,
                    'icon_svg' => $card->icon_svg,
                    'visible' => $card->pivot->visible,
                    'created_at' => $card->created_at,
                    'updated_at' => $card->updated_at,
                ];
            });

        return response()->json($cards);
    }

    /**
     * Crea una nuova card master e la assegna a tutti gli utenti
     * (Solo per admin/super-user, da proteggere con policy se necessario)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|string|unique:job_offer_cards,type',
            'icon_svg' => 'required|string',
        ]);

        // Crea la card master
        $card = JobOfferCard::create($validated);

        // Assegna la card a tutti gli utenti esistenti
        $users = User::all();
        foreach ($users as $user) {
            $user->jobOfferCards()->attach($card->id, ['visible' => true]);
        }

        return response()->json($card, 201);
    }

    /**
     * Mostra una card specifica con la configurazione dell'utente
     */
    public function show(string $id)
    {
        $user = Auth::user();
        $card = $user->jobOfferCards()->findOrFail($id);

        return response()->json([
            'id' => $card->id,
            'title' => $card->title,
            'type' => $card->type,
            'icon_svg' => $card->icon_svg,
            'visible' => $card->pivot->visible,
        ]);
    }

    /**
     * Aggiorna la visibilità di una card per l'utente corrente
     */
    public function update(Request $request, string $id)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'visible' => 'required|boolean',
        ]);

        // Aggiorna solo il pivot visible per questo utente
        $user->jobOfferCards()->updateExistingPivot($id, [
            'visible' => $validated['visible']
        ]);

        // Ritorna la card aggiornata
        $card = $user->jobOfferCards()->findOrFail($id);
        
        return response()->json([
            'id' => $card->id,
            'title' => $card->title,
            'type' => $card->type,
            'icon_svg' => $card->icon_svg,
            'visible' => $card->pivot->visible,
        ]);
    }

    /**
     * Elimina una card master (rimuove per tutti gli utenti)
     * (Solo per admin/super-user, da proteggere con policy se necessario)
     */
    public function destroy(string $id)
    {
        $card = JobOfferCard::findOrFail($id);
        $card->delete(); // Cascade elimina anche i record pivot

        return response()->json(['message' => 'Card eliminata con successo per tutti gli utenti'], 200);
    }

    /**
     * Toggle visibilità di una card per l'utente corrente
     */
    public function toggleVisibility(string $id)
    {
        $user = Auth::user();
        $card = $user->jobOfferCards()->findOrFail($id);
        
        $newVisibility = !$card->pivot->visible;
        
        $user->jobOfferCards()->updateExistingPivot($id, [
            'visible' => $newVisibility
        ]);

        return response()->json([
            'id' => $card->id,
            'title' => $card->title,
            'type' => $card->type,
            'visible' => $newVisibility,
        ]);
    }
}
