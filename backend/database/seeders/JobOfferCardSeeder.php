<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\JobOfferCard;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class JobOfferCardSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Card master (condivise tra tutti gli utenti)
        $masterCards = [
            [
                'title' => 'Totale Candidature',
                'type' => 'total',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
            ],
            [
                'title' => 'In Attesa',
                'type' => 'pending',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
            ],
            [
                'title' => 'Colloqui',
                'type' => 'interview',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            ],
            [
                'title' => 'Accettate',
                'type' => 'accepted',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
            ],
            [
                'title' => 'Archiviate',
                'type' => 'archived',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>',
            ],
            [
                'title' => 'Email Inviate',
                'type' => 'email',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
            ],
        ];

        // 1. Crea le card master (una volta sola, condivise)
        foreach ($masterCards as $cardData) {
            // Crea la card solo se non esiste già
            $card = JobOfferCard::firstOrCreate(
                ['type' => $cardData['type']], // Cerca per type
                [
                    'title' => $cardData['title'],
                    'icon_svg' => $cardData['icon_svg'],
                ]
            );
        }

        $this->command->info('Card master create!');

        // 2. Assegna tutte le card a tutti gli utenti esistenti
        $users = User::all();
        $cards = JobOfferCard::all();

        foreach ($users as $user) {
            foreach ($cards as $card) {
                // Usa la tabella pivot per assegnare la card all'utente
                // Se già esiste, skip
                DB::table('user_job_offer_card')->insertOrIgnore([
                    'user_id' => $user->id,
                    'job_offer_card_id' => $card->id,
                    'visible' => DB::raw('true'), // PostgreSQL boolean
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info('Card assegnate a tutti gli utenti!');
    }
}
