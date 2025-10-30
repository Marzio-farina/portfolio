<?php

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Mail\PasswordResetNotification;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Authentication Controller
 * 
 * Handles user registration, login, logout, and profile management
 * using Laravel Sanctum for token-based authentication.
 */
class AuthController extends Controller
{
    /**
     * Register a new user
     * 
     * @param RegisterRequest $request Validated registration data
     * @return JsonResponse User data with authentication token
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        // Force role to 'Guest' for any new registration (ignore client-provided role)
        $roleId = Role::where('title', 'Guest')->value('id');
        if (!$roleId) {
            // Create Guest role if missing
            $guest = Role::create(['title' => 'Guest']);
            $roleId = $guest->id;
        }

        // Create new user with hashed password
        $user = User::create([
            'name' => $request->name,
            'surname' => $request->surname,
            'date_of_birth' => $request->date_of_birth,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $roleId,
            'icon_id' => $request->icon_id,
        ]);

        // Generate unique slug: nome-cognome[-n]
        $base = Str::slug(trim(($user->name ?? '').' '.($user->surname ?? '')));
        if ($base === '') { $base = 'user-'.$user->id; }
        $slug = $base;
        $i = 2;
        while (User::where('slug', $slug)->where('id', '!=', $user->id)->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }
        $user->slug = $slug;
        $user->save();

        // Create empty user profile
        $user->profile()->create([]);

        // Generate authentication token
        $token = $user->createToken('spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ], 201);
    }

    /**
     * Authenticate user and return token
     * 
     * @param LoginRequest $request Validated login credentials
     * @return JsonResponse User data with authentication token or error
     */
    public function login(LoginRequest $request): JsonResponse
    {
        // Find user by email
        $user = User::where('email', $request->email)->first();

        // Validate credentials
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials'
            ], 401);
        }

        // Generate authentication token
        $token = $user->createToken('spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ]);
    }

    /**
     * Get authenticated user profile
     * 
     * @return JsonResponse Current user data or authentication error
     */
    public function me(): JsonResponse
    {
        /** @var User|null $user */
        $user = auth('sanctum')->user();

        if (!$user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        return response()->json($user);
    }

    /**
     * Logout user and revoke current token
     * 
     * @return JsonResponse Success message
     */
    public function logout(): JsonResponse
    {
        /** @var User|null $user */
        $user = auth('sanctum')->user();

        if ($user instanceof User) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Logged out'
        ]);
    }

    /**
     * Update authenticated user's profile
     * 
     * @param UpdateProfileRequest $request
     * @return JsonResponse
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = auth('sanctum')->user();
        if (!$user instanceof User) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            $profile = $user->profile()->create([]);
        }

        $data = $request->validated();
        // Gestione avatar_url (profilo) e icon_id (utente)
        // - Se arriva avatar_url non nullo: azzera l'icon_id
        // - Se arriva icon_id non nullo: azzera l'avatar_url del profilo

        if (array_key_exists('avatar_url', $data)) {
            // Aggiorna URL avatar sul profilo
            $profile->avatar_url = $data['avatar_url'];
            if (!empty($data['avatar_url'])) {
                // Se stai impostando un URL, rimuovi l'icona
                $user->icon_id = null;
                $user->save();
            }
            unset($data['avatar_url']);
        }

        if (array_key_exists('icon_id', $data)) {
            $user->icon_id = $data['icon_id'];
            $user->save();
            if (!empty($data['icon_id'])) {
                // Se selezioni un'icona, rimuovi l'avatar_url custom
                $profile->avatar_url = null;
            }
            unset($data['icon_id']);
        }

        // Campi profilo rimanenti
        $profile->fill($data);
        $profile->save();

        // Invalida le chiavi cache usate dal profilo pubblico
        Cache::forget('public_profile_v1');
        Cache::forget('public_profile_user_' . $user->id . '_v1');

        return response()->json([
            'message' => 'Profile updated',
            'profile' => $profile
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Send password reset link to user's email
     * 
     * @param ForgotPasswordRequest $request Validated email address
     * @return JsonResponse Success or error response
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $email = $request->validated()['email'];

        // Verify user exists
        $user = User::where('email', $email)->first();

        if (!$user) {
            // For security reasons, we return the same success message
            // even if the user doesn't exist to prevent email enumeration
            return response()->json([
                'ok' => true,
                'message' => 'Se l\'email esiste, ti abbiamo inviato le istruzioni per il recupero password.'
            ], 200);
        }

        try {
            // Generate password reset token
            $token = Password::createToken($user);

            // Send password reset email
            Mail::to($user->email)->send(new PasswordResetNotification($user, $token));

            Log::info('[PASSWORD RESET] Reset link sent', [
                'email' => $email,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'ok' => true,
                'message' => 'Ti abbiamo inviato le istruzioni per il recupero password. Controlla la tua email.'
            ], 200);

        } catch (\Exception $e) {
            Log::error('[PASSWORD RESET] Failed to send reset email', [
                'email' => $email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Si è verificato un errore. Riprova più tardi.'
            ], 500);
        }
    }

    /**
     * Reset user password with token
     * Validates the reset token and updates the user's password
     * 
     * @param ResetPasswordRequest $request Validated reset password data
     * @return JsonResponse Success or error response
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $email = $data['email'];
        $token = $data['token'];
        $password = $data['password'];

        try {
            // Use Laravel's Password facade to reset the password
            $status = Password::reset(
                [
                    'email' => $email,
                    'password' => $password,
                    'password_confirmation' => $password,
                    'token' => $token,
                ],
                function ($user, $password) {
                    $user->password = Hash::make($password);
                    $user->save();
                }
            );

            if ($status === Password::PASSWORD_RESET) {
                Log::info('[PASSWORD RESET] Password reset successful', [
                    'email' => $email,
                ]);

                return response()->json([
                    'ok' => true,
                    'message' => 'Password reimpostata con successo. Puoi ora accedere con la nuova password.'
                ], 200);
            } else {
                $messages = [
                    Password::INVALID_TOKEN => 'Il token di reset non è valido o è scaduto.',
                    Password::INVALID_USER => 'L\'utente con questa email non esiste.',
                ];

                $message = $messages[$status] ?? 'Si è verificato un errore durante il reset della password.';

                Log::warning('[PASSWORD RESET] Password reset failed', [
                    'email' => $email,
                    'status' => $status,
                ]);

                return response()->json([
                    'ok' => false,
                    'message' => $message
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('[PASSWORD RESET] Exception during password reset', [
                'email' => $email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Si è verificato un errore. Riprova più tardi.'
            ], 500);
        }
    }
}