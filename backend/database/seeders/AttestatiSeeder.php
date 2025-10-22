<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AttestatiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Prendi un utente esistente o creane uno al volo se non c'è
        $user = User::first() ?? User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
        ]);

        DB::table('attestati')->insert([
            'user_id'       => $user->id,
            'title'         => 'Certificazione Esempio',
            'description'   => 'Seed di prova per card',
            // 👇 percorso relativo alla tua struttura
            'poster'        => 'attestati/1 - Boolean/poster.webp',
            'poster_alt'    => 'Poster certificazione',
            'poster_w'      => 1200,
            'poster_h'      => 1600,
            'poster_lqip'   => null,
            'issuer'        => 'Ente Esempio',
            'issued_at'     => now()->subDays(10)->format('Y-m-d'),
            'expires_at'    => null,
            'credential_id' => Str::uuid()->toString(),
            'credential_url'=> 'https://example.com/cert.pdf',
            'status'        => 'published',
            'is_featured'   => true,
            'sort_order'    => 1,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
    }
}
