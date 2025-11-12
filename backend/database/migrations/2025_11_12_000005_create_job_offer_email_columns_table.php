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
        Schema::create('job_offer_email_columns', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // Nome della colonna (es: "Oggetto", "Destinatari", ecc.)
            $table->string('field_name'); // Nome del campo nel database (es: "subject", "to")
            $table->integer('default_order')->default(0); // Ordine di visualizzazione di default
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_offer_email_columns');
    }
};

