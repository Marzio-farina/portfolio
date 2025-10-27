// supabase/edge-functions/resize-avatar/index.ts
// Deno Edge Function: ridimensiona gli avatar caricati in produzione a 70x70
// Requisiti: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BUCKET (es. 'src')
// Trigger: Storage webhook su oggetti creati con prefix 'avatars/original/'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

interface StorageRecord {
  bucket_id: string;
  name: string; // chiave: es. avatars/original/filename.png
}

function env(name: string, fallback?: string): string {
  const v = Deno.env.get(name);
  if (!v && fallback === undefined) throw new Error(`Missing env: ${name}`);
  return v ?? fallback!;
}

const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const BUCKET = env('BUCKET', 'src');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  global: { headers: { 'X-Client-Info': 'resize-avatar-fn' } },
});

function getPublicUrl(key: string): string {
  // usa la URL pubblica standard di Supabase Storage
  // /object/public/<bucket>/<key>
  const base = SUPABASE_URL.replace(/\/?$/, '');
  return `${base}/storage/v1/object/public/${BUCKET}/${key}`;
}

function deriveTargetKey(originalKey: string): string {
  // avatars/original/xxx.ext -> avatars/70x70/xxx.webp
  const name = originalKey.replace(/^avatars\/original\//, '');
  const baseName = name.replace(/\.[^.]+$/, '');
  return `avatars/70x70/${baseName}.webp`;
}

async function resizeTo70(bytes: Uint8Array): Promise<Uint8Array> {
  const img = await Image.decode(bytes);
  img.contain(70, 70); // mantiene proporzioni, ingabbiando in 70x70
  return await img.encodeWEBP(80);
}

async function updateIconUrl(originalPublicUrl: string, smallPublicUrl: string) {
  const { data, error } = await supabase
    .from('icons')
    .update({ img: smallPublicUrl })
    .eq('img', originalPublicUrl)
    .select('id')
    .limit(1);
  if (error) throw error;
  return data?.[0]?.id ?? null;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // Supporta diversi formati di payload (Storage webhook / Realtime)
    const record: StorageRecord | undefined = payload?.record || payload?.data?.record || payload;
    if (!record?.name || !record?.bucket_id) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no record' }), { status: 200 });
    }

    if (record.bucket_id !== BUCKET) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'bucket mismatch' }), { status: 200 });
    }

    if (!record.name.startsWith('avatars/original/')) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'not original path' }), { status: 200 });
    }

    // Scarica l'originale
    const originalPublicUrl = getPublicUrl(record.name);
    const res = await fetch(originalPublicUrl, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'download failed', status: res.status }), { status: 502 });
    }
    const buf = new Uint8Array(await res.arrayBuffer());

    // Ridimensiona a 70x70
    const small = await resizeTo70(buf);

    // Salva la variante
    const targetKey = deriveTargetKey(record.name);
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(targetKey, small, {
      upsert: true,
      contentType: 'image/webp',
    });
    if (uploadErr) throw uploadErr;

    const smallPublicUrl = getPublicUrl(targetKey);

    // Aggiorna icons.img se punta all'URL originale appena creato
    let iconId: number | null = null;
    try {
      iconId = await updateIconUrl(originalPublicUrl, smallPublicUrl);
    } catch (e) {
      // non bloccare l'esecuzione: l'immagine è stata creata comunque
      console.warn('icons update failed:', e);
    }

    return new Response(JSON.stringify({ ok: true, targetKey, iconId, smallPublicUrl }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
