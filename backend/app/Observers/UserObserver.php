<?php

namespace App\Observers;

use App\Models\User;
use App\Models\JobOfferCard;
use Illuminate\Support\Facades\DB;

class UserObserver
{
    /**
     * Handle the User "created" event.
     * Assegna automaticamente tutte le card master al nuovo utente
     */
    public function created(User $user): void
    {
        // Ottieni tutte le card master
        $cards = JobOfferCard::all();
        
        // Se non ci sono card, skip per evitare errori
        if ($cards->isEmpty()) {
            return;
        }
        
        // Usa DB::table per inserimento diretto con cast esplicito a boolean
        // Questo evita il problema di type conversion di Eloquent con PostgreSQL
        $insertData = [];
        foreach ($cards as $card) {
            $insertData[] = [
                'user_id' => $user->id,
                'job_offer_card_id' => $card->id,
                'visible' => DB::raw('true'), // Cast esplicito a boolean per PostgreSQL
                'created_at' => now(),
                'updated_at' => now()
            ];
        }
        
        DB::table('user_job_offer_card')->insert($insertData);
    }

    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        //
    }

    /**
     * Handle the User "deleted" event.
     */
    public function deleted(User $user): void
    {
        //
    }

    /**
     * Handle the User "restored" event.
     */
    public function restored(User $user): void
    {
        //
    }

    /**
     * Handle the User "force deleted" event.
     */
    public function forceDeleted(User $user): void
    {
        //
    }
}
