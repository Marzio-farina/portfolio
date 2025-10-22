<?php

namespace App\Observers;

use App\Models\Attestato;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;

class AttestatoObserver
{
    public function saving(Attestato $a): void
    {
        if (!$a->isDirty('poster') || !$a->poster) return;

        $disk = Storage::disk('src'); // assicurati che esista questo disk
        if (!$disk->exists($a->poster)) return;

        $binary = $disk->get($a->poster);

        // v2: si passa il nome driver, non un’istanza di Driver
        $manager = new ImageManager([
            'driver' => extension_loaded('imagick') ? 'imagick' : 'gd',
        ]);

        // v2: make(), non read()
        $img = $manager->make($binary);

        $a->poster_w = $img->width();
        $a->poster_h = $img->height();

        // LQIP: lato lungo ≈ 24px, mantieni AR e non fare upscaling
        $clone = clone $img;
        $clone->resize(24, 24, function ($c) {
            $c->aspectRatio();
            $c->upsize();
        });

        // v2: encode('jpg', 40) poi cast a stringa per ottenere il binario
        $lqip = (string) $clone->encode('jpg', 40);

        $a->poster_lqip = 'data:image/jpeg;base64,' . base64_encode($lqip);
    }
}