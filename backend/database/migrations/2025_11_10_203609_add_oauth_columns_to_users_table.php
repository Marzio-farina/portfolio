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
        Schema::table('users', function (Blueprint $table) {
            // Provider OAuth (google, github, facebook, ecc.)
            $table->string('oauth_provider', 50)->nullable()->after('password');
            
            // ID univoco fornito dal provider
            $table->string('oauth_provider_id')->nullable()->after('oauth_provider');
            
            // Token OAuth (opzionale, per refresh)
            $table->text('oauth_token')->nullable()->after('oauth_provider_id');
            
            // Avatar URL dal provider OAuth
            $table->string('oauth_avatar_url')->nullable()->after('oauth_token');
            
            // Indici per performance
            $table->index(['oauth_provider', 'oauth_provider_id'], 'oauth_provider_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('oauth_provider_index');
            $table->dropColumn([
                'oauth_provider',
                'oauth_provider_id',
                'oauth_token',
                'oauth_avatar_url'
            ]);
        });
    }
};
