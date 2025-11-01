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
        Schema::create('github_repositories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('owner', 100); // es: Marzio-farina
            $table->string('repo', 100);  // es: portfolio
            $table->string('url', 255);   // es: https://github.com/Marzio-farina/portfolio
            $table->timestamps();
            
            // Un utente può avere multiple repository, ma non duplicati della stessa
            $table->unique(['user_id', 'owner', 'repo']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('github_repositories');
    }
};
