<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Aggiunge il prefisso "storage/" ai percorsi che non lo hanno.
     * Il percorso corretto in produzione è: /storage/avatars/avatar-1.png
     */
    public function up(): void
    {
        // Aggiorna i record che hanno "avatars/" senza "storage/"
        DB::table('icons')
            ->where('img', 'like', 'avatars/%')
            ->whereNotLike('img', 'storage/%')
            ->update([
                'img' => DB::raw("CONCAT('storage/', img)")
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Se necessario, rimuovi il prefisso
        DB::table('icons')
            ->where('img', 'like', 'storage/avatars/%')
            ->update([
                'img' => DB::raw("SUBSTRING(img, 9)")  // rimuovi i primi 8 caratteri ("storage/")
            ]);
    }
};
