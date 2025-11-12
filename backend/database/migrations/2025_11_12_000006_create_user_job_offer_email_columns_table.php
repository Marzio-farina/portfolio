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
        Schema::create('user_job_offer_email_columns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('job_offer_email_column_id')->constrained('job_offer_email_columns')->onDelete('cascade');
            $table->tinyInteger('visible')->default(1);
            $table->integer('order')->default(0); // Ordine personalizzato dall'utente
            $table->timestamps();

            // Indice unico per evitare duplicati
            $table->unique(['user_id', 'job_offer_email_column_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_job_offer_email_columns');
    }
};

