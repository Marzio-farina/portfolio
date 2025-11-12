<?php

namespace Database\Seeders;

use App\Models\JobOfferEmail;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;

class JobOfferEmailSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();

        if ($users->isEmpty()) {
            $this->command->warn('Nessun utente presente, skip seeder email.');
            return;
        }

        foreach ($users as $user) {
            // Evita di creare duplicati se già esistono email per l'utente
            if ($user->jobOfferEmails()->exists()) {
                continue;
            }

            $baseDate = Carbon::now()->subDays(10);

            $samples = [
                [
                    'subject' => 'Grazie per la candidatura – Conferma ricezione',
                    'preview' => 'Ciao, abbiamo ricevuto la tua candidatura per il ruolo di Frontend Developer...',
                    'direction' => 'received',
                    'from_address' => 'hr@acme.io',
                    'to_recipients' => [$user->email],
                    'cc_recipients' => null,
                    'bcc_recipients' => null,
                    'status' => 'received',
                    'sent_at' => $baseDate->copy()->addHours(2),
                    'message_id' => 'msg-' . uniqid(),
                    'related_job_offer' => 'Frontend Developer · ACME',
                ],
                [
                    'subject' => 'Follow-up colloquio Backend Engineer',
                    'preview' => 'Buongiorno, come concordato in call ti inviamo il materiale discusso...',
                    'direction' => 'sent',
                    'from_address' => $user->email,
                    'to_recipients' => ['sara.hr@techwave.com'],
                    'cc_recipients' => ['lead.dev@techwave.com'],
                    'bcc_recipients' => ['mentor@portfolio.dev'],
                    'status' => 'sent',
                    'sent_at' => $baseDate->copy()->addDay()->addHours(3),
                    'message_id' => 'msg-' . uniqid(),
                    'related_job_offer' => 'Backend Engineer · TechWave',
                ],
                [
                    'subject' => 'Reminder disponibilità colloquio',
                    'preview' => 'Ciao, confermiamo la disponibilità per il colloquio di giovedì alle 15:00...',
                    'direction' => 'sent',
                    'from_address' => $user->email,
                    'to_recipients' => ['jobs@innova.it'],
                    'cc_recipients' => null,
                    'bcc_recipients' => null,
                    'status' => 'sent',
                    'sent_at' => $baseDate->copy()->addDays(3)->addHours(4),
                    'message_id' => 'msg-' . uniqid(),
                    'related_job_offer' => 'Fullstack Developer · Innova',
                ],
                [
                    'subject' => 'Esito colloquio – Fullstack Developer',
                    'preview' => 'Ciao, ti ringraziamo per il colloquio. Al momento abbiamo deciso di procedere con altri candidati...',
                    'direction' => 'received',
                    'from_address' => 'talent@innova.it',
                    'to_recipients' => [$user->email],
                    'cc_recipients' => null,
                    'bcc_recipients' => null,
                    'status' => 'received',
                    'sent_at' => $baseDate->copy()->addDays(4)->addHours(5),
                    'message_id' => 'msg-' . uniqid(),
                    'related_job_offer' => 'Fullstack Developer · Innova',
                ],
                [
                    'subject' => 'Invio portfolio aggiornato',
                    'preview' => 'Buon pomeriggio, in allegato trovi il mio portfolio aggiornato come richiesto...',
                    'direction' => 'sent',
                    'from_address' => $user->email,
                    'to_recipients' => ['maria.hr@creativelab.io'],
                    'cc_recipients' => ['teamlead@creativelab.io'],
                    'bcc_recipients' => ['coach@portfolio.dev', 'referente@network.it'],
                    'status' => 'sent',
                    'sent_at' => $baseDate->copy()->addDays(6)->addHours(9),
                    'message_id' => 'msg-' . uniqid(),
                    'related_job_offer' => 'UI/UX Designer · CreativeLab',
                ],
            ];

            foreach ($samples as $sample) {
                JobOfferEmail::create(array_merge($sample, [
                    'user_id' => $user->id,
                    'to_recipients' => Arr::wrap($sample['to_recipients']),
                    'cc_recipients' => $sample['cc_recipients'] ? Arr::wrap($sample['cc_recipients']) : null,
                    'bcc_recipients' => $sample['bcc_recipients'] ? Arr::wrap($sample['bcc_recipients']) : null,
                ]));
            }
        }

        $this->command?->info('Job offer emails seed completato.');
    }
}

