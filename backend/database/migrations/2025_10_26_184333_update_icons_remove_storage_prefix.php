<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Rimuove il prefisso "storage/" da tutti i path nella tabella icons
     * per semplificare la struttura. La costruzione dell'URL completa
     * avviene nei Resource tramite getAbsoluteUrl().
     */
    public function up(): void
    {
        // Rimuovi il prefisso "storage/" da tutti i record
        DB::table('icons')
            ->where('img', 'like', 'storage/%')
            ->update([
                'img' => DB::raw("SUBSTRING(img, 9)")  // rimuovi i primi 8 caratteri ("storage/")
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Se necessario, puoi ripristinare il prefisso per gli avatar di default
        DB::table('icons')
            ->where('type', 'default')
            ->whereNotLike('img', 'storage/%')
            ->update([
                'img' => DB::raw("CONCAT('storage/', img)")
            ]);
    }
};
