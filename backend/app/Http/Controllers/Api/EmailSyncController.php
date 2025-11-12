<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ICloudEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class EmailSyncController extends Controller
{
    protected ICloudEmailService $emailService;

    public function __construct(ICloudEmailService $emailService)
    {
        $this->emailService = $emailService;
    }

    /**
     * Sincronizza email iCloud per l'utente autenticato
     */
    public function syncEmails(): JsonResponse
    {
        // Aumenta il timeout di esecuzione PHP per questa operazione
        set_time_limit(300); // 5 minuti
        ini_set('max_execution_time', '300');
        
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utente non autenticato'
                ], 401);
            }

            $result = $this->emailService->syncEmailsForUser($user);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Sincronizzazione completata con successo',
                    'stats' => $result['stats']
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Errore durante la sincronizzazione',
                'stats' => $result['stats'] ?? []
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la sincronizzazione: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verifica lo stato della connessione iCloud
     */
    public function testConnection(): JsonResponse
    {
        try {
            $connected = $this->emailService->connect();
            
            if ($connected) {
                $this->emailService->disconnect();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Connessione iCloud stabilita con successo'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Impossibile connettersi a iCloud. Verifica le credenziali.'
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore connessione: ' . $e->getMessage()
            ], 500);
        }
    }
}

