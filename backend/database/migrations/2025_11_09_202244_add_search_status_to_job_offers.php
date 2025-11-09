<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Rimuovi il vecchio CHECK constraint
        DB::statement("ALTER TABLE job_offers DROP CONSTRAINT IF EXISTS job_offers_status_check");
        
        // Aggiungi il nuovo CHECK constraint con 'search'
        DB::statement("ALTER TABLE job_offers ADD CONSTRAINT job_offers_status_check CHECK (status IN ('pending', 'interview', 'accepted', 'rejected', 'archived', 'search'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rimuovi il constraint con 'search'
        DB::statement("ALTER TABLE job_offers DROP CONSTRAINT IF EXISTS job_offers_status_check");
        
        // Ripristina il constraint senza 'search'
        DB::statement("ALTER TABLE job_offers ADD CONSTRAINT job_offers_status_check CHECK (status IN ('pending', 'interview', 'accepted', 'rejected', 'archived'))");
    }
};
