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
        // Aggiorna eventuale card legacy "email" al nuovo tipo "email-total"
        $legacyEmailCard = JobOfferCard::where('type', 'email')->first();
        if ($legacyEmailCard) {
            $legacyEmailCard->update([
                'type' => 'email-total',
                'title' => 'Email Totali',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 6.5V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6.5"/><path d="m22 6-10 7L2 6"/><path d="M2 6h20"/></svg>',
            ]);
        }

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
                'title' => 'Rifiutate',
                'type' => 'rejected',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            ],
            [
                'title' => 'Archiviate',
                'type' => 'archived',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>',
            ],
            [
                'title' => 'Email Totali',
                'type' => 'email-total',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 6.5V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6.5"/><path d="m22 6-10 7L2 6"/><path d="M2 6h20"/></svg>',
            ],
            [
                'title' => 'Email Inviate',
                'type' => 'email-sent',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg>',
            ],
            [
                'title' => 'Email Ricevute',
                'type' => 'email-received',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12 12 22 2 12"/><path d="M12 2v20"/></svg>',
            ],
            [
                'title' => 'Destinatari Nascosti',
                'type' => 'email-bcc',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/><path d="M21 12c-2.4 3.5-5.1 5-9 5s-6.6-1.5-9-5c2.4-3.5 5.1-5 9-5s6.6 1.5 9 5Z"/><path d="m3 3 18 18"/></svg>',
            ],
            [
                'title' => 'VIP',
                'type' => 'vip',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
            ],
            [
                'title' => 'Bozze',
                'type' => 'drafts',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>',
            ],
            [
                'title' => 'Posta Inviata',
                'type' => 'sent-mail',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg>',
            ],
            [
                'title' => 'Posta Indesiderata',
                'type' => 'junk-mail',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>',
            ],
            [
                'title' => 'Cestino',
                'type' => 'trash',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
            ],
            [
                'title' => 'Archivio Mail',
                'type' => 'mail-archive',
                'icon_svg' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14"/><path d="M4 3h16"/><path d="M10 11h4"/><path d="m12 11 0 6"/></svg>',
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
