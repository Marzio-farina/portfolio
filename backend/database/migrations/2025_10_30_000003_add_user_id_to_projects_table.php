<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Project;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        // Backfill: assegna tutti i progetti esistenti all'utente pubblico (default 1)
        $publicUserId = (int) env('PUBLIC_USER_ID', 1);
        Project::whereNull('user_id')->update(['user_id' => $publicUserId]);

        // Rendi non nullo dopo backfill
        Schema::table('projects', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};


