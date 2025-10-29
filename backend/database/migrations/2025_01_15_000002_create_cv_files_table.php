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
        Schema::create('cv_files', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('user_id')
                  ->constrained()
                  ->cascadeOnDelete(); // Se elimini l'utente, elimina anche i suoi CV
            
            $table->string('filename', 255); // Nome originale del file
            $table->string('file_path', 500); // Path relativo o URL assoluto
            $table->string('mime_type', 100)->default('application/pdf');
            $table->unsignedBigInteger('file_size')->nullable(); // Dimensione in bytes
            $table->string('title', 255)->nullable(); // Titolo opzionale (es. "CV_2025")
            $table->boolean('is_default')->default(false); // CV di default per l'utente
            
            $table->timestamps();
            
            // Indici
            $table->index('user_id');
            $table->index(['user_id', 'is_default'], 'cv_files_user_default_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cv_files');
    }
};

