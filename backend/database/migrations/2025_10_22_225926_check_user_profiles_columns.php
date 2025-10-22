<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // Aggiungi title se non esiste
            if (!Schema::hasColumn('user_profiles', 'title')) {
                $table->string('title', 255)->nullable()->after('user_id');
            }
            
            // Aggiungi bio se non esiste
            if (!Schema::hasColumn('user_profiles', 'bio')) {
                $table->text('bio')->nullable()->after('title');
            }
            
            // Aggiungi avatar_url se non esiste
            if (!Schema::hasColumn('user_profiles', 'avatar_url')) {
                $table->string('avatar_url', 500)->nullable()->after('bio');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'title')) {
                $table->dropColumn('title');
            }
            if (Schema::hasColumn('user_profiles', 'bio')) {
                $table->dropColumn('bio');
            }
            if (Schema::hasColumn('user_profiles', 'avatar_url')) {
                $table->dropColumn('avatar_url');
            }
        });
    }
};