<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $req) {
        $user = User::create([
            'name' => $req->name,
            'surname' => $req->surname,
            'date_of_birth' => $req->date_of_birth,
            'email' => $req->email,
            'password' => Hash::make($req->password),
            'role_id' => $req->role_id,
            'icon_id' => $req->icon_id,
        ]);
        // opzionale: crea profilo
        $user->profile()->create([]);

        $token = $user->createToken('spa')->plainTextToken;
        return response()->json(['token' => $token, 'user' => $user], 201);
    }

    public function login(LoginRequest $req) {
        $user = User::where('email', $req->email)->first();

        if (!$user || !Hash::check($req->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('spa')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user]);
    }

    public function me() {
        // Usa il guard sanctum (Bearer token)
        $user = auth('sanctum')->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        return response()->json($user);
    }

    // public function logout() {
    //     $user = auth('sanctum')->user();
    //     if ($user && $user->currentAccessToken()) {
    //         $user->currentAccessToken()->delete();
    //     }
    //     return response()->json(['message' => 'Logged out']);
    // }
}