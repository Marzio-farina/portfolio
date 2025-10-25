<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Icon extends Model
{
    protected $fillable = ['img', 'alt', 'type'];

    /**
     * Get the users that use this icon
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the testimonials that use this icon
     */
    public function testimonials()
    {
        return $this->hasMany(Testimonial::class);
    }
}
