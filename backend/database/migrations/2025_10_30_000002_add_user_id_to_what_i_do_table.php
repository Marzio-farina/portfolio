<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('what_i_do', function (Blueprint $table) {
            if (!Schema::hasColumn('what_i_do', 'user_id')) {
                $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete()->after('id');
                $table->index('user_id');
            }
        });

        // Backfill: associa tutti i record esistenti all'utente principale (id=1 di default)
        $adminId = (int) (env('PUBLIC_USER_ID', 1));
        DB::table('what_i_do')->whereNull('user_id')->update(['user_id' => $adminId]);
    }

    public function down(): void
    {
        Schema::table('what_i_do', function (Blueprint $table) {
            if (Schema::hasColumn('what_i_do', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropIndex(['user_id']);
                $table->dropColumn('user_id');
            }
        });
    }
};


