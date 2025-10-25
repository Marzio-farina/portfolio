<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('testimonials', function (Blueprint $table) {
            $table->bigIncrements('id');
            
            // User ID nullable: se NULL, è un visitatore non registrato
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            // Dati visitatore (utilizzati se user_id è NULL)
            $table->string('author_name', 100)->nullable(); // Nome obbligatorio per visitatori
            $table->string('author_surname', 100)->nullable(); // Cognome facoltativo
            $table->string('avatar_url', 500)->nullable(); // Icona/immagine facoltativa
            
            // Dati testimonial
            $table->text('text'); // Testo del commento (obbligatorio)
            $table->string('role_company', 150)->nullable(); // Ruolo in azienda
            $table->string('company', 150)->nullable(); // Azienda (facoltativa)
            $table->smallInteger('rating'); // Valutazione 1-5 (obbligatoria)
            
            // Tracciamento visitatore per matching futuro
            $table->string('ip_address', 45)->nullable(); // Indirizzo IP (IPv4 e IPv6)
            $table->text('user_agent')->nullable(); // User-Agent del browser/dispositivo
            
            $table->timestamps();
            
            // Indici per ricerche future
            $table->index('ip_address');
            $table->index('user_agent');
        });

        // CHECK constraint solo per PostgreSQL
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE testimonials ADD CONSTRAINT testimonials_rating_check CHECK (rating BETWEEN 1 AND 5)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('testimonials');
    }
};
