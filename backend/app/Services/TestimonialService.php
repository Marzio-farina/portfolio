<?php

namespace App\Services;

use App\Models\Testimonial;
use App\Models\Icon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Testimonial Service
 * 
 * Gestisce la logica di business per le testimonianze
 */
class TestimonialService
{
    /**
     * Crea una nuova testimonianza con avatar
     * 
     * @param array $data Dati della testimonianza
     * @return Testimonial
     * @throws \Throwable
     */
    public function createTestimonialWithAvatar(array $data): Testimonial
    {
        return TransactionService::execute(function () use ($data) {
            // 1. Carica avatar se presente
            $iconId = null;
            if (!empty($data['avatar'])) {
                $icon = $this->uploadAvatar($data['avatar'], $data['author_name']);
                $iconId = $icon->id;
            }

            // 2. Crea la testimonianza
            $testimonial = Testimonial::create([
                'author_name' => $data['author_name'],
                'author_role' => $data['author_role'] ?? null,
                'content' => $data['content'],
                'rating' => $data['rating'] ?? 5,
                'icon_id' => $iconId,
                'user_id' => $data['user_id'] ?? null,
                'is_approved' => $data['is_approved'] ?? false,
            ]);

            // 3. Log dell'operazione
            Log::info('Testimonial created successfully', [
                'testimonial_id' => $testimonial->id,
                'author' => $testimonial->author_name,
            ]);

            return $testimonial->load('icon');
        });
    }

    /**
     * Aggiorna una testimonianza
     * 
     * @param Testimonial $testimonial
     * @param array $data
     * @return Testimonial
     * @throws \Throwable
     */
    public function updateTestimonialWithAvatar(Testimonial $testimonial, array $data): Testimonial
    {
        return TransactionService::execute(function () use ($testimonial, $data) {
            $oldIconId = $testimonial->icon_id;

            // 1. Aggiorna dati base
            $testimonial->update([
                'author_name' => $data['author_name'] ?? $testimonial->author_name,
                'author_role' => $data['author_role'] ?? $testimonial->author_role,
                'content' => $data['content'] ?? $testimonial->content,
                'rating' => $data['rating'] ?? $testimonial->rating,
                'is_approved' => $data['is_approved'] ?? $testimonial->is_approved,
            ]);

            // 2. Gestisci nuovo avatar
            if (!empty($data['avatar'])) {
                $newIcon = $this->uploadAvatar($data['avatar'], $testimonial->author_name);
                $testimonial->update(['icon_id' => $newIcon->id]);

                // Elimina vecchio avatar
                if ($oldIconId) {
                    $this->deleteOldIcon($oldIconId);
                }
            }

            Log::info('Testimonial updated successfully', [
                'testimonial_id' => $testimonial->id,
            ]);

            return $testimonial->load('icon');
        });
    }

    /**
     * Elimina testimonianza
     * 
     * @param Testimonial $testimonial
     * @return bool
     * @throws \Throwable
     */
    public function deleteTestimonialWithAvatar(Testimonial $testimonial): bool
    {
        return TransactionService::execute(function () use ($testimonial) {
            $iconId = $testimonial->icon_id;
            $testimonialId = $testimonial->id;

            // 1. Elimina testimonianza
            $testimonial->delete();

            // 2. Elimina avatar se presente
            if ($iconId) {
                $this->deleteOldIcon($iconId);
            }

            Log::info('Testimonial deleted successfully', [
                'testimonial_id' => $testimonialId,
            ]);

            return true;
        });
    }

    /**
     * Upload avatar
     */
    private function uploadAvatar($file, string $authorName): Icon
    {
        $extension = $file->getClientOriginalExtension();
        $filename = 'avatar_' . Str::uuid() . '.' . $extension;
        
        if (app()->environment('production')) {
            $relativePath = 'avatars/original/' . $filename;
            $binary = file_get_contents($file->getRealPath());
            Storage::disk('src')->put($relativePath, $binary);
            
            $baseUrl = rtrim(config('filesystems.disks.src.url'), '/');
            $imgPath = $baseUrl . '/' . $relativePath;
        } else {
            $storedPath = $file->storeAs('avatars', $filename, 'public');
            $imgPath = 'storage/' . ltrim($storedPath, '/');
        }

        return Icon::create([
            'img' => $imgPath,
            'alt' => $authorName . ' - Avatar',
            'type' => 'user_uploaded'
        ]);
    }

    /**
     * Elimina icona vecchia
     */
    private function deleteOldIcon(int $iconId): void
    {
        try {
            $oldIcon = Icon::find($iconId);
            if ($oldIcon) {
                $path = str_replace('storage/', '', $oldIcon->img);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
                $oldIcon->delete();
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to delete old icon', [
                'icon_id' => $iconId,
                'error' => $e->getMessage()
            ]);
        }
    }
}

