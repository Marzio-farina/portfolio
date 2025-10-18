<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Project;
use App\Models\Technology;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = Category::all();
        $techs = Technology::all();

        Project::factory(5)->create()->each(function ($project) use ($categories, $techs) {
            $project->category_id = $categories->random()->id;
            $project->save();

            $project->technologies()->attach(
                $techs->random(rand(2, 4))->pluck('id')->toArray()
            );
        });
    }
}
