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
        Schema::table('icons', function (Blueprint $table) {
            $table->enum('type', ['default', 'user_uploaded'])->default('default')->after('alt');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('icons', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
