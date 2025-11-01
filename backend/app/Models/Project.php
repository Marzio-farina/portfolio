<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Project Model
 * 
 * Represents a portfolio project with associated category,
 * technologies, and media files.
 */
class Project extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'category_id',
        'user_id',
        'description',
        'poster',
        'video',
        'layout_config'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'layout_config' => 'json'
    ];

    // ========================================================================
    // Relationships
    // ========================================================================

    /**
     * Get the project's category
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get the project's technologies
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function technologies()
    {
        return $this->belongsToMany(Technology::class, 'project_technology');
    }

    /**
     * Proprietario del progetto (utente)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // ========================================================================
    // Mutators
    // ========================================================================

    /**
     * Assicura che description non sia mai null
     * 
     * @param mixed $value
     * @return void
     */
    public function setDescriptionAttribute($value): void
    {
        \Illuminate\Support\Facades\Log::info('=== MUTATOR setDescriptionAttribute CHIAMATO ===', [
            'value_received' => $value,
            'value_type' => gettype($value),
            'value_is_null' => $value === null,
            'value_is_empty_string' => $value === '',
            'value_length' => is_string($value) ? strlen($value) : 'N/A',
        ]);

        // Garantisce che description non sia mai null
        // Se il valore è null, usa stringa vuota
        // Se è una stringa vuota, mantienila
        // Altrimenti trim e usa il valore
        if ($value === null) {
            $this->attributes['description'] = '';
            \Illuminate\Support\Facades\Log::info('Mutator: value era null, impostato a stringa vuota');
        } elseif ($value === '') {
            $this->attributes['description'] = '';
            \Illuminate\Support\Facades\Log::info('Mutator: value era stringa vuota, mantenuto');
        } else {
            $trimmed = trim((string)$value);
            $this->attributes['description'] = $trimmed;
            \Illuminate\Support\Facades\Log::info('Mutator: value processato', [
                'original' => $value,
                'trimmed' => $trimmed,
                'final_length' => strlen($trimmed),
            ]);
        }

        \Illuminate\Support\Facades\Log::info('Mutator completato', [
            'final_value' => $this->attributes['description'],
            'final_type' => gettype($this->attributes['description']),
            'final_is_null' => $this->attributes['description'] === null,
        ]);
    }
}
