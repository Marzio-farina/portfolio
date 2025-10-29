<x-mail::message>
# 🔐 Recupero Password

Ciao {{ $user->name }},

Hai richiesto il recupero della password per il tuo account su **{{ config('app.name') }}**.

Per reimpostare la password, clicca sul pulsante qui sotto:

<x-mail::button :url="$resetUrl" color="primary">
Recupera Password
</x-mail::button>

Oppure copia e incolla questo link nel browser:

{{ $resetUrl }}

---

**Informazioni importanti:**
- Il link è valido per **60 minuti** dalla richiesta
- Se non hai richiesto tu il recupero password, ignora questa email
- Per motivi di sicurezza, il link può essere utilizzato una sola volta

---

Se non funziona il pulsante, copia questo link nel browser:  
`{{ $resetUrl }}`

Grazie,  
Il team di {{ config('app.name') }}
</x-mail::message>

