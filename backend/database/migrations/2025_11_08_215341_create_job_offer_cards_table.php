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
        // Tabella master delle card (condivise tra tutti gli utenti)
        Schema::create('job_offer_cards', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // Titolo della card (es: "Totale Candidature")
            $table->string('type')->unique(); // Tipo univoco (es: 'total', 'pending', 'interview')
            $table->text('icon_svg'); // Markup SVG completo dell'icona (viewBox, path, rect, ecc.)
            $table->timestamps();
        });

        // Tabella pivot: visibilità card per utente (Many-to-Many)
        Schema::create('user_job_offer_card', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('job_offer_card_id')->constrained()->onDelete('cascade');
            $table->boolean('visible')->default(true); // Visibilità per questo utente
            $table->timestamps();
            
            // Ogni utente può avere una card solo una volta
            $table->unique(['user_id', 'job_offer_card_id']);
            
            // Indici per query veloci
            $table->index('user_id');
            $table->index('job_offer_card_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_job_offer_card');
        Schema::dropIfExists('job_offer_cards');
    }
};
