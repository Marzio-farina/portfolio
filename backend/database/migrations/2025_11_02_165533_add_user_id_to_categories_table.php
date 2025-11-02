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
        Schema::table('categories', function (Blueprint $table) {
            // Aggiungi user_id dopo l'id, nullable per i dati esistenti
            $table->foreignId('user_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('users')
                  ->cascadeOnDelete();
            
            // Aggiungi soft delete
            $table->softDeletes();
            
            // Aggiungi indice univoco su (user_id, title) per evitare duplicati per utente
            // Nota: non possiamo aggiungere unique subito se ci sono dati esistenti con user_id NULL
            $table->index(['user_id', 'title']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            // Rimuovi l'indice
            $table->dropIndex(['user_id', 'title']);
            
            // Rimuovi soft delete
            $table->dropSoftDeletes();
            
            // Rimuovi la foreign key e la colonna
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
