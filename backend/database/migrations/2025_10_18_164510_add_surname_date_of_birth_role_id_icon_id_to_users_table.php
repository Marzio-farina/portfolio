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
        Schema::table('users', function (Blueprint $table) {
            $table->string('surname', 50)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->unsignedSmallInteger('role_id');
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->unsignedSmallInteger('icon_id')->nullable();
            $table->foreign('icon_id')->references('id')->on('icons')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // prima rimuovi le foreign key
            $table->dropForeign(['role_id']);
            $table->dropForeign(['icon_id']);
            // poi rimuovi le colonne
            $table->dropColumn(['surname', 'date_of_birth', 'role_id', 'icon_id']);
        });
    }
};
