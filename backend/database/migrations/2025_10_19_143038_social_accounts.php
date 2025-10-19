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
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->string('provider', 30);            // es: facebook, instagram, linkedin, github
            $table->string('handle', 100)->nullable(); // @username
            $table->string('url', 255)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'provider']);   // 1 riga per provider/utente
            $table->index(['provider']);               // query rapide per provider
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('social_accounts');
    }
};
