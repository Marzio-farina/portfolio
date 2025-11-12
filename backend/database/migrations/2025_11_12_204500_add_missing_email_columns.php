<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Usa SQL raw per aggiungere colonne solo se non esistono
        DB::statement("
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offer_emails' AND column_name = 'is_vip') THEN
                    ALTER TABLE job_offer_emails ADD COLUMN is_vip BOOLEAN DEFAULT false;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offer_emails' AND column_name = 'is_junk') THEN
                    ALTER TABLE job_offer_emails ADD COLUMN is_junk BOOLEAN DEFAULT false;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offer_emails' AND column_name = 'is_deleted') THEN
                    ALTER TABLE job_offer_emails ADD COLUMN is_deleted BOOLEAN DEFAULT false;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offer_emails' AND column_name = 'is_archived') THEN
                    ALTER TABLE job_offer_emails ADD COLUMN is_archived BOOLEAN DEFAULT false;
                END IF;
            END $$;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("
            ALTER TABLE job_offer_emails 
            DROP COLUMN IF EXISTS is_vip,
            DROP COLUMN IF EXISTS is_junk,
            DROP COLUMN IF EXISTS is_deleted,
            DROP COLUMN IF EXISTS is_archived;
        ");
    }
};

