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
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->unique()                               // 1 profilo per utente
                  ->constrained()                          // references users(id)
                  ->cascadeOnDelete();                     // se elimini user, elimina profilo
            $table->string('phone', 20)->nullable();
            $table->string('location', 100)->nullable();   // città / provincia
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
