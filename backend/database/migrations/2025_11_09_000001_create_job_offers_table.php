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
        Schema::create('job_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Azienda finale
            $table->string('company_name');
            
            // Azienda di recruiter
            $table->string('recruiter_company')->nullable();
            
            // Posizione
            $table->string('position');
            
            // Modalità di lavoro (Remote, On-site, Hybrid, etc.)
            $table->string('work_mode')->nullable();
            
            // Località dell'azienda
            $table->string('location')->nullable();
            
            // Data annuncio
            $table->date('announcement_date')->nullable();
            
            // Data invio candidatura
            $table->date('application_date')->nullable();
            
            // Sito web
            $table->string('website')->nullable();
            
            // Registrato (se si è registrati sul portale/sito)
            $table->tinyInteger('is_registered')->default(0);
            
            // Campi aggiuntivi utili
            $table->enum('status', ['pending', 'interview', 'accepted', 'rejected', 'archived'])->default('pending');
            $table->string('salary_range')->nullable();
            $table->text('notes')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_offers');
    }
};

