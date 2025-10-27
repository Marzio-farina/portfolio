<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;

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
        // Resolve default role when not provided (fallback to 'Guest')
        $roleId = $request->role_id;
        if (!$roleId) {
            $roleId = Role::where('title', 'Guest')->value('id');
            if (!$roleId) {
                // as last resort, pick first role or create Guest
                $first = Role::query()->value('id');
                if ($first) {
                    $roleId = $first;
                } else {
                    $guest = Role::create(['title' => 'Guest']);
                    $roleId = $guest->id;
                }
            }
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

        $profile->fill($request->validated());
        $profile->save();

        // Invalida le chiavi cache usate dal profilo pubblico
        Cache::forget('public_profile_v1');
        Cache::forget('public_profile_user_' . $user->id . '_v1');

        return response()->json([
            'message' => 'Profile updated',
            'profile' => $profile
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}