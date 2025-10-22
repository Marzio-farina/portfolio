<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

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
        // Create new user with hashed password
        $user = User::create([
            'name' => $request->name,
            'surname' => $request->surname,
            'date_of_birth' => $request->date_of_birth,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $request->role_id,
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
        $user = auth('sanctum')->user();

        if (!$user) {
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
        $user = auth('sanctum')->user();

        if ($user) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Logged out'
        ]);
    }
}