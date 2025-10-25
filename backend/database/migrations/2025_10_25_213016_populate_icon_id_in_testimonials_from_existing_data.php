<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Icon;
use App\Models\Testimonial;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Popola icon_id nei testimonials esistenti basandosi sui dati disponibili
     */
    public function up(): void
    {
        // 1. Per i testimonials di utenti registrati, usa l'icona dell'utente
        DB::statement("
            UPDATE testimonials 
            SET icon_id = (
                SELECT u.icon_id 
                FROM users u 
                WHERE u.id = testimonials.user_id
            )
            WHERE user_id IS NOT NULL 
            AND icon_id IS NULL
        ");

        // 2. Per i testimonials di visitatori con avatar_url, crea nuove icone se necessario
        $testimonialsWithAvatar = Testimonial::whereNull('user_id')
            ->whereNotNull('avatar_url')
            ->whereNull('icon_id')
            ->get();

        foreach ($testimonialsWithAvatar as $testimonial) {
            // Cerca se esiste già un'icona con questa URL
            $existingIcon = Icon::where('img', $testimonial->avatar_url)->first();
            
            if ($existingIcon) {
                // Usa l'icona esistente
                $testimonial->update(['icon_id' => $existingIcon->id]);
            } else {
                // Crea una nuova icona
                $newIcon = Icon::create([
                    'img' => $testimonial->avatar_url,
                    'alt' => $testimonial->author_name ?? 'Avatar visitatore'
                ]);
                
                $testimonial->update(['icon_id' => $newIcon->id]);
            }
        }

        // 3. Per i testimonials senza icona, crea un'icona di default se necessario
        $defaultIcon = Icon::where('img', 'like', '%default%')->first();
        
        if (!$defaultIcon) {
            $defaultIcon = Icon::create([
                'img' => '/assets/default-avatar.png', // Assumi che esista questo file
                'alt' => 'Avatar predefinito'
            ]);
        }

        // Assegna l'icona di default ai testimonials senza icona
        DB::statement("
            UPDATE testimonials 
            SET icon_id = {$defaultIcon->id}
            WHERE icon_id IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     * Rimuove icon_id dai testimonials (non rimuove le icone create)
     */
    public function down(): void
    {
        // Rimuovi icon_id da tutti i testimonials
        DB::statement("UPDATE testimonials SET icon_id = NULL");
        
        // Opzionale: rimuovi le icone create per i visitatori (commentato per sicurezza)
        // DB::statement("DELETE FROM icons WHERE img LIKE '%avatar%' AND id NOT IN (SELECT DISTINCT icon_id FROM users WHERE icon_id IS NOT NULL)");
    }
};
