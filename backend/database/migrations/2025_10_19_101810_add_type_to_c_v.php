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
        Schema::table('curricula', function (Blueprint $table) {
            $table->string('type', 20)->default('experience')->after('id'); // 'education' | 'experience'
            $table->index('type', 'curricula_type_index');
            $table->index(['type', 'time_start'], 'curricula_type_time_start_index');
            $table->index(['type', 'time_end'], 'curricula_type_time_end_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('curricula', function (Blueprint $table) {
            $table->dropIndex('curricula_type_index');
            $table->dropIndex('curricula_type_time_start_index');
            $table->dropIndex('curricula_type_time_end_index');
            $table->dropColumn('type');
        });
    }
};
