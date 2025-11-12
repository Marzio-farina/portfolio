<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\JobOfferEmailColumn;
use Illuminate\Support\Facades\DB;

class JobOfferEmailColumnSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Colonne master per la tabella email candidature
        $columns = [
            ['title' => 'Oggetto', 'field_name' => 'subject', 'default_order' => 1],
            ['title' => 'Tipo', 'field_name' => 'direction', 'default_order' => 2],
            ['title' => 'Destinatari', 'field_name' => 'to', 'default_order' => 3],
            ['title' => 'BCC', 'field_name' => 'bcc', 'default_order' => 4],
            ['title' => 'Stato', 'field_name' => 'status', 'default_order' => 5],
            ['title' => 'Data', 'field_name' => 'sent_at', 'default_order' => 6],
            ['title' => 'Candidatura', 'field_name' => 'related', 'default_order' => 7],
        ];

        foreach ($columns as $columnData) {
            JobOfferEmailColumn::firstOrCreate(
                ['field_name' => $columnData['field_name']],
                [
                    'title' => $columnData['title'],
                    'default_order' => $columnData['default_order']
                ]
            );
        }

        $this->command->info('Colonne email job offer create!');
    }
}

