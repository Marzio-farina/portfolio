<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->string('location_url')->nullable()->after('location');
        });

        // Imposta un valore di default per l'utente principale (id=1)
        DB::table('user_profiles')
            ->where('user_id', 1)
            ->update([
                'location_url' => 'https://www.google.com/maps?q=San%20Valentino%20Torio%2C%20Italia&hl=it&z=13&output=embed'
            ]);
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('location_url');
        });
    }
};


