<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('slug', 120)->nullable()->unique()->after('surname');
        });

        // Backfill: genera slug univoci nome-cognome[-n]
        $users = DB::table('users')->select('id','name','surname','slug')->get();
        $taken = [];
        foreach ($users as $u) {
            if (!empty($u->slug)) { $taken[$u->slug] = true; continue; }
            $base = Str::slug(trim(($u->name ?? '').' '.($u->surname ?? '')));
            if ($base === '') { $base = 'user-'.$u->id; }
            $slug = $base;
            $i = 2;
            while (isset($taken[$slug]) || DB::table('users')->where('slug', $slug)->exists()) {
                $slug = $base.'-'.$i;
                $i++;
            }
            DB::table('users')->where('id', $u->id)->update(['slug' => $slug]);
            $taken[$slug] = true;
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'slug')) {
                $table->dropUnique(['slug']);
                $table->dropColumn('slug');
            }
        });
    }
};


