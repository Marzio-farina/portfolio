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
        Schema::table('testimonials', function (Blueprint $table) {
            // Aggiungi icon_id per gestire le icone dei visitatori in modo coerente
            $table->unsignedSmallInteger('icon_id')->nullable()->after('author_surname');
            $table->foreign('icon_id')->references('id')->on('icons')->nullOnDelete();
            
            // Aggiungi indice per performance
            $table->index('icon_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('testimonials', function (Blueprint $table) {
            // Rimuovi prima la foreign key
            $table->dropForeign(['icon_id']);
            // Poi rimuovi l'indice
            $table->dropIndex(['icon_id']);
            // Infine rimuovi la colonna
            $table->dropColumn('icon_id');
        });
    }
};
