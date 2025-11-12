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
        Schema::table('job_offer_emails', function (Blueprint $table) {
            $table->boolean('is_vip')->default(false)->after('has_bcc');
            $table->boolean('is_junk')->default(false)->after('is_vip');
            $table->boolean('is_deleted')->default(false)->after('is_junk');
            $table->boolean('is_archived')->default(false)->after('is_deleted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_offer_emails', function (Blueprint $table) {
            $table->dropColumn(['is_vip', 'is_junk', 'is_deleted', 'is_archived']);
        });
    }
};
