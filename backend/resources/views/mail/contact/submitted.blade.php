<x-mail::message>
# 📩 Nuovo messaggio dal sito

The body of your message.

Hai ricevuto un nuovo messaggio tramite il form di contatto del sito **{{ config('app.name') }}**.

---

**Nome:** {{ $data['name'] ?? '-' }}  
**Cognome:** {{ $data['surname'] ?? '-' }}  
**Email:** [{{ $data['email'] ?? '-' }}](mailto:{{ $data['email'] ?? '' }})

---

**Messaggio:**

> {!! nl2br(e($data['message'] ?? '')) !!}

---

Grazie,  
{{ config('app.name') }}
</x-mail::message>