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
        Schema::create('attestati', function (Blueprint $table) {
            $table->bigIncrements('id');                 // id
            $table->foreignId('user_id')                 // proprietario (portfolio)
                  ->constrained()
                  ->cascadeOnDelete();

            $table->string('title', 150);                // titolo attestato (richiesto)
            $table->text('description')->nullable();     // descrizione (opzionale)
            $table->string('poster', 255)->nullable();   // immagine / cover (opzionale)

            // campi utili
            $table->string('issuer', 150)->nullable();   // ente che rilascia
            $table->date('issued_at')->nullable();       // data rilascio
            $table->date('expires_at')->nullable();      // data scadenza (se presente)

            $table->string('credential_id', 100)->nullable();   // ID credenziale
            $table->string('credential_url', 255)->nullable();  // link verifica

            $table->string('status', 20)->default('published'); // 'draft' | 'published'
            $table->boolean('is_featured')->default(false);      // evidenza in UI
            $table->unsignedSmallInteger('sort_order')->nullable(); // ordinamento manuale

            $table->timestamps();
            $table->softDeletes();

            // indici utili
            $table->index(['user_id', 'status']);
            $table->index(['issued_at']);
            $table->index(['expires_at']);
            $table->unique(['user_id', 'title', 'issuer', 'issued_at'], 'attestati_unique_per_user');
        });

        // CHECK per Postgres (coerente con il tuo stile)
        // 1) status ammesso
        DB::statement("ALTER TABLE attestati ADD CONSTRAINT attestati_status_check CHECK (status IN ('draft','published'))");
        // 2) relazione date coerente: expires_at >= issued_at (se entrambe valorizzate)
        DB::statement("ALTER TABLE attestati ADD CONSTRAINT attestati_dates_check CHECK (expires_at IS NULL OR issued_at IS NULL OR expires_at >= issued_at)");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attestati');
    }
};
