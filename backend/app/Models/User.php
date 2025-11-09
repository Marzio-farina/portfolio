<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * User Model
 * 
 * Represents a user in the portfolio system with authentication
 * capabilities and relationships to various portfolio entities.
 * 
 * @method \Laravel\Sanctum\NewAccessToken createToken(string $name, array $abilities = ['*'])
 * @method \Laravel\Sanctum\PersonalAccessToken|null currentAccessToken()
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'surname',
        'slug',
        'date_of_birth',
        'email',
        'password',
        'role_id',
        'icon_id'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_of_birth' => 'date',
        ];
    }

    // ========================================================================
    // Relationships
    // ========================================================================

    /**
     * Get the user's role
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the user's icon
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function icon()
    {
        return $this->belongsTo(Icon::class);
    }

    /**
     * Get the user's testimonials
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function testimonials()
    {
        return $this->hasMany(Testimonial::class);
    }

    /**
     * Get the user's profile
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    /**
     * Get the user's social accounts
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function socialAccounts()
    {
        return $this->hasMany(SocialAccount::class);
    }

    /**
     * Get the user's GitHub repositories
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function githubRepositories()
    {
        return $this->hasMany(GitHubRepository::class);
    }

    /**
     * Get the user's job offers
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function jobOffers()
    {
        return $this->hasMany(JobOffer::class);
    }

    /**
     * Link all testimonials from a visitor (identified by IP and/or User-Agent) to this user
     * This is called when a visitor registers after leaving testimonials
     *
     * @param string|null $ipAddress The IP address of the visitor
     * @param string|null $userAgent The User-Agent of the visitor
     * @return int Number of testimonials linked
     */
    public function linkVisitorTestimonialsToUser(?string $ipAddress = null, ?string $userAgent = null): int
    {
        $query = Testimonial::whereNull('user_id');

        // Match per IP e/o User-Agent
        if ($ipAddress && $userAgent) {
            // Se abbiamo entrambi, match più specifico
            $query->where(function ($q) use ($ipAddress, $userAgent) {
                $q->where('ip_address', $ipAddress)
                  ->orWhere('user_agent', $userAgent);
            });
        } elseif ($ipAddress) {
            // Match solo per IP
            $query->where('ip_address', $ipAddress);
        } elseif ($userAgent) {
            // Match solo per User-Agent
            $query->where('user_agent', $userAgent);
        }

        return $query->update(['user_id' => $this->id]);
    }

    /**
     * Get the user's job offer cards configuration (Many-to-Many)
     * Un utente può configurare la visibilità di molte card
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function jobOfferCards()
    {
        return $this->belongsToMany(JobOfferCard::class, 'user_job_offer_card')
            ->withPivot('visible')
            ->withTimestamps();
    }
}
