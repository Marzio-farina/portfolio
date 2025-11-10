<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Services\LoggerService;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

/**
 * OAuth Controller
 * 
 * Gestisce l'autenticazione tramite provider OAuth (Google, GitHub, Facebook, ecc.)
 */
class OAuthController extends Controller
{
    /**
     * Redirect utente alla pagina di autorizzazione del provider
     * 
     * @param string $provider Nome del provider (google, github, facebook)
     * @return RedirectResponse
     */
    public function redirectToProvider(string $provider): RedirectResponse
    {
        $allowedProviders = ['google', 'github', 'facebook'];
        
        if (!in_array($provider, $allowedProviders)) {
            abort(400, 'Provider non supportato');
        }

        try {
            // Usa stateless() per evitare requisito sessioni
            return Socialite::driver($provider)->stateless()->redirect();
        } catch (\Exception $e) {
            LoggerService::logError("OAuth redirect failed for {$provider}", $e);
            abort(500, 'Errore durante il redirect OAuth');
        }
    }

    /**
     * Gestisce il callback dal provider OAuth
     * Crea o aggiorna l'utente e genera un token di autenticazione
     * 
     * @param string $provider Nome del provider
     * @return RedirectResponse Redirect al frontend con token
     */
    public function handleProviderCallback(string $provider): RedirectResponse
    {
        $allowedProviders = ['google', 'github', 'facebook'];
        
        if (!in_array($provider, $allowedProviders)) {
            return $this->redirectWithError('Provider non supportato');
        }

        try {
            // Ottieni le informazioni utente dal provider
            $socialUser = Socialite::driver($provider)->stateless()->user();

            // Trova o crea l'utente
            $user = $this->findOrCreateUser($socialUser, $provider);

            // Genera token di autenticazione
            $token = $user->createToken('spa')->plainTextToken;

            LoggerService::logAction("User logged in via {$provider}", [
                'user_id' => $user->id,
                'email' => $user->email,
                'provider' => $provider
            ]);

            // Redirect al frontend con il token
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:4200');
            return redirect()->away("{$frontendUrl}/auth/callback?token={$token}&provider={$provider}");

        } catch (\Exception $e) {
            LoggerService::logError("OAuth callback failed for {$provider}", $e);
            return $this->redirectWithError('Autenticazione fallita');
        }
    }

    /**
     * Trova o crea un utente basato sui dati del provider OAuth
     * 
     * @param mixed $socialUser Dati utente dal provider
     * @param string $provider Nome del provider
     * @return User
     */
    private function findOrCreateUser($socialUser, string $provider): User
    {
        return TransactionService::execute(function () use ($socialUser, $provider) {
            // Cerca utente esistente per provider e ID
            $user = User::where('oauth_provider', $provider)
                ->where('oauth_provider_id', $socialUser->getId())
                ->first();

            // Se non trovato per OAuth, cerca per email
            if (!$user && $socialUser->getEmail()) {
                $user = User::where('email', $socialUser->getEmail())->first();
                
                // Se trovato per email, collega l'account OAuth
                if ($user) {
                    $user->update([
                        'oauth_provider' => $provider,
                        'oauth_provider_id' => $socialUser->getId(),
                        'oauth_token' => $socialUser->token,
                        'oauth_avatar_url' => $socialUser->getAvatar(),
                    ]);
                    
                    LoggerService::logAction("OAuth account linked to existing user", [
                        'user_id' => $user->id,
                        'provider' => $provider
                    ]);
                }
            }

            // Se ancora non trovato, crea nuovo utente
            if (!$user) {
                // Ottieni ruolo Guest
                $roleId = Role::where('title', 'Guest')->value('id');
                if (!$roleId) {
                    $guest = Role::create(['title' => 'Guest']);
                    $roleId = $guest->id;
                }

                // Estrai nome e cognome
                $fullName = $socialUser->getName() ?? '';
                $nameParts = explode(' ', trim($fullName), 2);
                $name = $nameParts[0] ?? '';
                $surname = $nameParts[1] ?? '';

                // Crea nuovo utente
                $user = User::create([
                    'name' => $name,
                    'surname' => $surname,
                    'email' => $socialUser->getEmail(),
                    'password' => Hash::make(Str::random(32)), // Password casuale (non usata)
                    'role_id' => $roleId,
                    'oauth_provider' => $provider,
                    'oauth_provider_id' => $socialUser->getId(),
                    'oauth_token' => $socialUser->token,
                    'oauth_avatar_url' => $socialUser->getAvatar(),
                    'email_verified_at' => now(), // Email già verificata dal provider
                ]);

                // Genera slug unico
                $base = Str::slug(trim(($user->name ?? '') . ' ' . ($user->surname ?? '')));
                if (empty($base)) {
                    $base = 'user-' . $user->id;
                }
                
                $slug = $base;
                $counter = 2;
                
                while (User::where('slug', $slug)->where('id', '!=', $user->id)->exists() && $counter < 100) {
                    $slug = $base . '-' . $counter;
                    $counter++;
                }
                
                $user->slug = $slug;
                $user->save();

                // Crea profilo vuoto
                $user->profile()->create([
                    'avatar_url' => $socialUser->getAvatar(), // Usa avatar OAuth come default
                ]);

                LoggerService::logAction("New user registered via {$provider}", [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'provider' => $provider
                ]);
            }

            return $user;
        });
    }

    /**
     * Redirect al frontend con messaggio di errore
     * 
     * @param string $message Messaggio di errore
     * @return RedirectResponse
     */
    private function redirectWithError(string $message): RedirectResponse
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:4200');
        return redirect()->away("{$frontendUrl}/auth?error=" . urlencode($message));
    }
}

