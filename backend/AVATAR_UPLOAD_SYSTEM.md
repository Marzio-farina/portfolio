# 📸 Sistema Upload Avatar per Testimonials

## 🎯 Panoramica

Il sistema permette ai visitatori di caricare avatar personalizzati quando creano un testimonial. Gli avatar vengono salvati nella cartella `public/storage/avatars/` e vengono automaticamente ottimizzati e registrati nella tabella `icons`.

## 🔄 Flusso URL Aggiornato (v2.0)

```
Database:     avatars/avatar-1.png
API Response: /avatars/avatar-1.png
Localhost:    http://localhost:8000/avatars/avatar-1.png
Production:   https://api.marziofarina.it/avatars/avatar-1.png
```

**Nota**: Il prefisso `/storage/` è stato rimosso per semplificare il routing in Vercel.

## 🚀 Endpoint Disponibili

### 1. Upload Avatar Standalone
```http
POST /api/avatars/upload
Content-Type: multipart/form-data

Fields:
- avatar: file (required) - Immagine da caricare (max 2MB)
- alt_text: string (optional) - Testo alternativo per l'immagine
```

**Risposta di Successo:**
```json
{
  "success": true,
  "icon": {
    "id": 123,
    "img": "avatars/avatar_uuid.jpg",
    "alt": "Avatar visitatore"
  },
  "message": "Avatar caricato con successo"
}
```

### 2. Creazione Testimonial con Upload Avatar
```http
POST /api/testimonials
Content-Type: multipart/form-data

Fields:
- author_name: string (required)
- author_surname: string (optional)
- text: string (required)
- rating: integer (required, 1-5)
- avatar_file: file (optional) - Avatar da caricare
- icon_id: integer (optional) - ID icona esistente
- avatar_url: string (optional) - URL avatar esterno
- role_company: string (optional)
- company: string (optional)
```

### 3. Ottenere Avatar Predefiniti
```http
GET /api/testimonials/default-avatars
```

**Risposta:**
```json
{
  "avatars": [
    {
      "id": 9,
      "img": "http://localhost:8000/avatars/avatar-1.png",
      "alt": "Avatar 1"
    }
  ]
}
```

### 4. Eliminazione Avatar (Solo Autenticati)
```http
DELETE /api/avatars/{id}
Authorization: Bearer {token}
```

## 🔧 Configurazione Tecnica

### Validazione File
- **Formati supportati**: JPEG, PNG, JPG, GIF, WebP
- **Dimensione massima**: 2MB
- **Ottimizzazione automatica**: Ridimensionamento a 150x150px per testimonials, 200x200px per avatar standalone
- **Qualità**: 85% per bilanciare qualità e dimensione

### Sicurezza
- **Nomi file unici**: UUID per evitare conflitti
- **Validazione MIME**: Controllo del tipo di file
- **Sanitizzazione**: Rimozione caratteri pericolosi dal percorso
- **Cleanup automatico**: Rimozione file in caso di errore

### Storage
- **Percorso database**: `avatars/avatar-1.png` (senza prefisso storage/)
- **Percorso fisico**: `storage/app/public/avatars/`
- **URL pubblico (localhost)**: `http://localhost:8000/avatars/`
- **URL pubblico (produzione)**: `https://api.marziofarina.it/avatars/`

## 📝 Esempi di Utilizzo

### Frontend JavaScript
```javascript
// Upload avatar standalone
const uploadAvatar = async (file, altText = '') => {
  const formData = new FormData();
  formData.append('avatar', file);
  formData.append('alt_text', altText);
  
  const response = await fetch('/api/avatars/upload', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
};

// Creazione testimonial con avatar
const createTestimonialWithAvatar = async (data) => {
  const formData = new FormData();
  formData.append('author_name', data.name);
  formData.append('text', data.text);
  formData.append('rating', data.rating);
  
  if (data.avatarFile) {
    formData.append('avatar_file', data.avatarFile);
  } else if (data.iconId) {
    formData.append('icon_id', data.iconId);
  }
  
  const response = await fetch('/api/testimonials', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
};
```

### Frontend HTML
```html
<form id="testimonialForm" enctype="multipart/form-data">
  <input type="text" name="author_name" placeholder="Nome" required>
  <textarea name="text" placeholder="Testimonial" required></textarea>
  <input type="number" name="rating" min="1" max="5" required>
  <input type="file" name="avatar_file" accept="image/*">
  <button type="submit">Invia Testimonial</button>
</form>
```

## 🔄 Priorità Gestione Icone

Il sistema gestisce le icone con la seguente priorità:

1. **icon_id** - Icona esistente specificata
2. **avatar_file** - File caricato dall'utente
3. **avatar_url** - URL esterno fornito

## 🧪 Test Sistema Avatar

### Eseguire Test in Localhost
```bash
php artisan app:test-avatar-system
```

### Eseguire Test Simulando Produzione
```bash
php artisan app:test-avatar-system --production
```

**Output Test**:
- ✅ Verifica integrità database
- ✅ Controlla file fisici
- ✅ Valida URL paths
- ✅ Testa endpoint API
- ✅ Verifica relazioni database

Per un report dettagliato: vedi `backend/TEST_REPORT_AVATAR_SYSTEM.md`

## 🛠️ Manutenzione

### Pulizia File Orfani
```bash
php artisan tinker
>>> $orphanFiles = Storage::disk('public')->files('avatars');
>>> foreach($orphanFiles as $file) {
>>>   $path = $file;
>>>   if(!Icon::where('img', $path)->exists()) {
>>>     echo "Orphan: " . $file . "\n";
>>>   }
>>> }
```

### Ottimizzazione Database
```sql
-- Trova icone non utilizzate
SELECT i.* FROM icons i 
LEFT JOIN testimonials t ON t.icon_id = i.id 
LEFT JOIN users u ON u.icon_id = i.id 
WHERE t.id IS NULL AND u.id IS NULL;
```

## 🚨 Troubleshooting

### Errori Comuni

1. **"404 on avatar URL in production"**
   - Eseguire: `php copy-storage-to-public.php` durante il build
   - Verificare `vercel.json` con routing `/avatars/* → /public/storage/avatars/*`

2. **"File too large"**
   - Verifica limite PHP: `upload_max_filesize` e `post_max_size`
   - Controlla validazione Laravel (max:2048 = 2MB)

3. **"Image optimization failed"**
   - Verifica che Intervention Image sia installato
   - Controlla permessi cartella storage

4. **"Permission denied"**
   ```bash
   chmod -R 755 storage/app/public/avatars
   ```

## 📊 Monitoraggio

### Log
- **Upload riusciti**: Log normale
- **Errori upload**: Log errori con dettagli
- **Ottimizzazione fallita**: Log warning

### Metriche
- Dimensione media file caricati
- Numero upload per giorno
- File più utilizzati

## 🔮 Future Enhancements

- [ ] Supporto per più formati immagine
- [ ] Compressione avanzata con WebP
- [ ] CDN integration
- [ ] Batch upload
- [ ] Watermark automatico
- [ ] AI-powered image optimization
