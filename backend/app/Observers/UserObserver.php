<?php

namespace App\Observers;

use App\Models\User;
use App\Models\JobOfferCard;

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
        
        // Assegna tutte le card all'utente con visible=true
        $syncData = [];
        foreach ($cards as $card) {
            $syncData[$card->id] = ['visible' => true];
        }
        
        $user->jobOfferCards()->sync($syncData);
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
