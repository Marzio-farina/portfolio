<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobOfferCardResource;
use App\Models\JobOfferCard;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class JobOfferCardController extends Controller
{
    /**
     * Restituisce tutte le card dell'utente autenticato con la configurazione di visibilità
     */
    public function index()
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ottieni solo i campi necessari: id, type, icon_svg, title e visible dal pivot
        $cards = $user->jobOfferCards()
            ->select(['job_offer_cards.id', 'job_offer_cards.type', 'job_offer_cards.icon_svg', 'job_offer_cards.title'])
            ->orderBy('job_offer_cards.id', 'asc')
            ->get();

        return response()->json(JobOfferCardResource::collection($cards));
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

        // Ricarica la card con il pivot per l'utente autenticato per avere visible
        $cardWithPivot = Auth::user()->jobOfferCards()->find($card->id);
        
        return response()->json(new JobOfferCardResource($cardWithPivot ?? $card), 201);
    }

    /**
     * Mostra una card specifica con la configurazione dell'utente
     */
    public function show(string $id)
    {
        /** @var User $user */
        $user = Auth::user();
        $card = $user->jobOfferCards()->findOrFail($id);

        return response()->json(new JobOfferCardResource($card));
    }

    /**
     * Aggiorna la visibilità di una card per l'utente corrente
     */
    public function update(Request $request, string $id)
    {
        /** @var User $user */
        $user = Auth::user();
        
        $validated = $request->validate([
            'visible' => 'required|boolean',
        ]);

        // Aggiorna solo il pivot visible per questo utente (con cast PostgreSQL)
        $visibleValue = $validated['visible'] ? DB::raw('true') : DB::raw('false');
        
        $user->jobOfferCards()->updateExistingPivot($id, [
            'visible' => $visibleValue
        ]);

        // Ritorna la card aggiornata
        $card = $user->jobOfferCards()->findOrFail($id);
        
        return response()->json(new JobOfferCardResource($card));
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
        /** @var User $user */
        $user = Auth::user();
        $card = $user->jobOfferCards()->findOrFail($id);
        
        $newVisibility = !$card->pivot->visible;
        $visibleValue = $newVisibility ? DB::raw('true') : DB::raw('false');
        
        $user->jobOfferCards()->updateExistingPivot($id, [
            'visible' => $visibleValue
        ]);

        // Ricarica la card per avere i dati aggiornati
        $card = $user->jobOfferCards()->findOrFail($id);
        
        return response()->json(new JobOfferCardResource($card));
    }
}
