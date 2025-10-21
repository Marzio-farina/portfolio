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
        Schema::table('attestati', function (Blueprint $table) {
            $table->string('poster_alt', 150)->nullable()->after('poster');
            $table->unsignedSmallInteger('poster_w')->nullable()->after('poster_alt');
            $table->unsignedSmallInteger('poster_h')->nullable()->after('poster_w');
            $table->text('poster_lqip')->nullable()->after('poster_h'); // base64 data URI (tiny)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attestati', function (Blueprint $table) {
            $table->dropColumn(['poster_alt','poster_w','poster_h','poster_lqip']);
        });
    }
};
