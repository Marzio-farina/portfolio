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
        Schema::table('curricula', function (Blueprint $table) {
            $table->integer('order')->default(0)->after('description');
            $table->index(['user_id', 'type', 'order']); // Indice per query ordinate
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('curricula', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'type', 'order']);
            $table->dropColumn('order');
        });
    }
};
