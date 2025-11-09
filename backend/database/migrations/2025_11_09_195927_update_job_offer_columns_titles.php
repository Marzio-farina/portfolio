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
        // Aggiorna i titoli delle colonne
        DB::table('job_offer_columns')
            ->where('field_name', 'work_mode')
            ->update(['title' => 'Modalità']);

        DB::table('job_offer_columns')
            ->where('field_name', 'location')
            ->update(['title' => 'Località']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Ripristina i titoli originali
        DB::table('job_offer_columns')
            ->where('field_name', 'work_mode')
            ->update(['title' => 'Modalità di lavoro']);

        DB::table('job_offer_columns')
            ->where('field_name', 'location')
            ->update(['title' => 'Località dell\'azienda']);
    }
};
