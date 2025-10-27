<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('technologies', function (Blueprint $table) {
            $table->string('type', 20)->nullable()->index()->after('description');
        });

        // Vincolo di validazione valori consentiti (PostgreSQL/SQLite supportano CHECK)
        // Consente null per compatibilità con dati esistenti
        DB::statement("ALTER TABLE technologies ADD CONSTRAINT technologies_type_check CHECK (type IN ('frontend','backend') OR type IS NULL)");
    }

    public function down(): void
    {
        // Rimuovi vincolo e colonna
        try {
            DB::statement('ALTER TABLE technologies DROP CONSTRAINT IF EXISTS technologies_type_check');
        } catch (\Throwable $e) {
            // best-effort
        }

        Schema::table('technologies', function (Blueprint $table) {
            if (Schema::hasColumn('technologies', 'type')) {
                $table->dropColumn('type');
            }
        });
    }
};


