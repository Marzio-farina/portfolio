<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(3),
            'category_id' => Category::inRandomOrder()->first()->id ?? 1,
            'description' => $this->faker->paragraph(3),
            'poster' => $this->faker->imageUrl(640, 480, 'project'),
            'video' => 'https://www.youtube.com/watch?v=' . $this->faker->regexify('[A-Za-z0-9_-]{11}'),
        ];
    }
}
