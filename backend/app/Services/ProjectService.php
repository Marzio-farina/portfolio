<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Icon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Project Service
 * 
 * Gestisce la logica di business per i progetti
 * con transazioni database robuste
 */
class ProjectService
{
    /**
     * Crea un nuovo progetto con tutte le relazioni
     * 
     * @param array $data Dati del progetto
     * @return Project
     * @throws \Throwable
     */
    public function createProjectWithRelations(array $data): Project
    {
        return TransactionService::execute(function () use ($data) {
            // 1. Crea il progetto base
            $project = Project::create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'url' => $data['url'] ?? null,
                'github_url' => $data['github_url'] ?? null,
                'user_id' => auth()->id(),
                'category_id' => $data['category_id'] ?? null,
            ]);

            // 2. Carica l'immagine se presente
            if (!empty($data['image'])) {
                $icon = $this->uploadProjectImage($data['image'], $project->title);
                $project->update(['icon_id' => $icon->id]);
            }

            // 3. Associa le tecnologie
            if (!empty($data['technologies']) && is_array($data['technologies'])) {
                $project->technologies()->attach($data['technologies']);
            }

            // 4. Log dell'operazione
            Log::info('Project created successfully', [
                'project_id' => $project->id,
                'user_id' => auth()->id(),
                'title' => $project->title,
            ]);

            // 5. Carica le relazioni per il response
            return $project->load(['icon', 'technologies', 'category', 'user']);
        });
    }

    /**
     * Aggiorna un progetto con tutte le relazioni
     * 
     * @param Project $project Progetto da aggiornare
     * @param array $data Nuovi dati
     * @return Project
     * @throws \Throwable
     */
    public function updateProjectWithRelations(Project $project, array $data): Project
    {
        return TransactionService::execute(function () use ($project, $data) {
            $oldIconId = $project->icon_id;

            // 1. Aggiorna i dati base
            $project->update([
                'title' => $data['title'] ?? $project->title,
                'description' => $data['description'] ?? $project->description,
                'url' => $data['url'] ?? $project->url,
                'github_url' => $data['github_url'] ?? $project->github_url,
                'category_id' => $data['category_id'] ?? $project->category_id,
            ]);

            // 2. Gestisci nuova immagine
            if (!empty($data['image'])) {
                $newIcon = $this->uploadProjectImage($data['image'], $project->title);
                $project->update(['icon_id' => $newIcon->id]);

                // Elimina la vecchia immagine
                if ($oldIconId) {
                    $this->deleteOldIcon($oldIconId);
                }
            }

            // 3. Sincronizza tecnologie
            if (isset($data['technologies']) && is_array($data['technologies'])) {
                $project->technologies()->sync($data['technologies']);
            }

            // 4. Log dell'operazione
            Log::info('Project updated successfully', [
                'project_id' => $project->id,
                'user_id' => auth()->id(),
            ]);

            return $project->load(['icon', 'technologies', 'category', 'user']);
        });
    }

    /**
     * Elimina un progetto e tutte le sue relazioni
     * 
     * @param Project $project
     * @return bool
     * @throws \Throwable
     */
    public function deleteProjectWithRelations(Project $project): bool
    {
        return TransactionService::execute(function () use ($project) {
            $iconId = $project->icon_id;
            $projectId = $project->id;

            // 1. Rimuovi relazioni many-to-many
            $project->technologies()->detach();

            // 2. Elimina il progetto
            $project->delete();

            // 3. Elimina l'icona associata se presente
            if ($iconId) {
                $this->deleteOldIcon($iconId);
            }

            // 4. Log dell'operazione
            Log::info('Project deleted successfully', [
                'project_id' => $projectId,
                'user_id' => auth()->id(),
            ]);

            return true;
        });
    }

    /**
     * Upload immagine progetto
     * 
     * @param mixed $file File upload
     * @param string $projectTitle Titolo del progetto per alt text
     * @return Icon
     */
    private function uploadProjectImage($file, string $projectTitle): Icon
    {
        $extension = $file->getClientOriginalExtension();
        $filename = 'project_' . Str::uuid() . '.' . $extension;
        
        if (app()->environment('production')) {
            // Produzione: Supabase
            $relativePath = 'projects/' . $filename;
            $binary = file_get_contents($file->getRealPath());
            Storage::disk('src')->put($relativePath, $binary);
            
            $baseUrl = rtrim(config('filesystems.disks.src.url'), '/');
            $imgPath = $baseUrl . '/' . $relativePath;
        } else {
            // Locale: storage pubblico
            $storedPath = $file->storeAs('projects', $filename, 'public');
            $imgPath = 'storage/' . ltrim($storedPath, '/');
        }

        return Icon::create([
            'img' => $imgPath,
            'alt' => $projectTitle . ' - Immagine progetto',
            'type' => 'project'
        ]);
    }

    /**
     * Elimina icona vecchia
     * 
     * @param int $iconId
     * @return void
     */
    private function deleteOldIcon(int $iconId): void
    {
        try {
            $oldIcon = Icon::find($iconId);
            if ($oldIcon) {
                // Elimina file fisico se esiste
                $path = str_replace('storage/', '', $oldIcon->img);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
                // Elimina record
                $oldIcon->delete();
            }
        } catch (\Throwable $e) {
            // Best-effort: non bloccare se fallisce la pulizia
            Log::warning('Failed to delete old icon', [
                'icon_id' => $iconId,
                'error' => $e->getMessage()
            ]);
        }
    }
}

