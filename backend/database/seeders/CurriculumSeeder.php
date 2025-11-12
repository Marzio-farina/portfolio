<?php

namespace Database\Seeders;

use App\Models\Cv;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurriculumSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Force delete per eliminare veramente i record (inclusi i soft-deleted)
        Cv::withTrashed()->forceDelete();

        // Reset sequence solo per PostgreSQL
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER SEQUENCE curricula_id_seq RESTART WITH 1');
        }

        $education = [
            [
                "title"=> "Specializzazioni Web Developer con Aulab",
                "years"=> "28/07/2025 - 29/08/2025",
                "description"=> "Ho frequentato il corso Hackademy Specializzazioni Web Developer, durante il quale ho acquisito una conoscenza nei vari argomenti trattati ( React – Java – Coding AI - Cybersecurity )."
            ],
            [
                "title"=> "Expert Angular corso di Fabio Biondi",
                "years"=> "01/01/2025 - 01/03/2025",
                "description"=> "Ho frequentato il corso Angular Evolution di Fabio Biondi una delle figure emergenti di expert Angular aquisendo padronanda nel framework Angular come Front-end."
            ],
            [
                "title"=> "Full Stack developer con Aulab",
                "years"=> "01/12/2023 - 31/06/2024",
                "description"=> "Ho frequentato il corso Hackademy Part-Time IT 29^ Edizione, durante il quale ho acquisito padronanza e autonomia con la console Unix, HTML5, CSS3, JavaScript, PHP, framework Laravel e Livewire, nonché le metodologie agili. A compimento del corso, insieme al mio team, abbiamo realizzato il progetto Claim-it (https://github.com/Hackademy-Part-time-29/presto_3_code_eaters)."
            ],
            [
                "title"=> "Geometra",
                "years"=> "09/2009 - 08/2014",
                "description"=> "ISTITUTO STATALE ISTRUZIONE SUPERIORE \"Leonardo Da Vinci\" | Poggiomarino Napoli"
            ]
        ];
        $experience = [
            [
                "title" => "Sviluppatore applicativi web come full stack developer - Freelance",
                "years" => "22/01/2025 - In Corso",
                "description" => "Realizzo applicazioni web complete, moderne e performanti, curando ogni fase dello sviluppo: dall’analisi dei requisiti al design dell’interfaccia, fino all’implementazione del backend e alla messa online.\n Mi occupo sia della parte frontend (Angular, React, HTML5, CSS3, TypeScript) che di quella backend (Laravel, Node.js, .NET), integrando API, database relazionali e sistemi di autenticazione.\n Collaboro con aziende e professionisti per creare soluzioni su misura - dashboard gestionali, sistemi di prenotazione, piattaforme e-commerce e strumenti di automazione - con particolare attenzione a usabilità, prestazioni e scalabilità."
            ],
            [
                "title" => "Sviluppatore applicativi windows e Gestionali [Privato] (Consulenza Appalti - Contabilità -Automazione) | Nocera Inferiore Salerno",
                "years" => "01/01/2019 - 21/01/2025",
                "description" => "• Analisi e Supervisione: Monitoraggio delle attività lavorative e gestione dei processi operativi. \n • Produzione Grafica: Creazione di elaborati tecnici 2D e 3D con AutoCAD, Archicad e 3DS Max per autorizzazioni e titoli abilitativi per Acea S.p.A.; modifica e conversione di disegni tecnici. \n • Gestione Cantiere: Redazione di contabilità, libretti misure e pianificazione delle risorse in cantiere con EMAX e SAP ERP per manutenzione rete elettrica MT e BT per ENEL e Acea S.p.A. \n • Data Management: Raccolta e gestione dati per presentazioni e report sull'andamento delle lavorazioni. \n • Supporto Gestionale: Assistenza a Cebat S.p.A. nella migrazione gestionale da \"Pigae\" a \"Integra\" e verifica delle idoneità tecnico-professionali delle subappaltatrici tramite \"Integra\" e \"CO.SI.\"; allineamento dei gestionali per garantire la congruità documentale.\n • Automazione Grafica: Automazione della produzione di elaborati tecnici con VBA e VB.Net interfacciati con AutoCAD e ArchiCad. \n • Document Automation: Automazione della creazione di documenti Word, Excel e PowerPoint per autorizzazioni, contabilità e reportistica con VBA e VB.Net. \n • Gestionale Automation: Automazione della migrazione gestionale e verifica delle idoneità tecniche, accelerando il controllo, rinomina, suddivisione, unione, rettifica, catalogazione e caricamento dei documenti nel gestionale di destinazione."
            ],
            [
                "title" => "Geometra - Studio privato",
                "years" => "01/01/2018 - 31/12/2019",
                "description" => "• Elaborazione e certificazione di progetti di ristrutturazione, modifica o ampliamento di edifici. \n • Effettuazione di rilievi e tracciati, anche con l'utilizzo di software specifici. \n • Redazione di pratiche e documenti per lo svolgimento di attività di cantiere ordinarie, ristrutturazioni o demolizioni. \n • Redazione di computi metrici-estimativi nelle fasi di costruzione e demolizione di opere primarie e complementari. \n • Esecuzione di accertamenti catastali e verifica della conformità nelle operazioni di compravendita. \n • Supporto al cliente per progetti, computi metrici e altra documentazione tecnica propedeutica all'ottenimento di benefici e bonus. \n • Utilizzo di Primus DCF, Impresus, AutoCAD, 3DS Max, Archicad per progetti di assiemi, modelli e altri disegni tecnici. "
            ]
        ];

        // Inserimento - assegna tutti i CV all'utente principale (ID = 1)
        $orderEdu = 0;
        foreach ($education as $row) {
            [$start, $end] = $this->splitYears($row['years']);
            Cv::create([
                'user_id'     => 1, // Assegna all'utente principale
                'type'        => 'education',
                'title'       => $row['title'],
                'time_start'  => $start?->toDateString(),
                'time_end'    => $end?->toDateString(),
                'description' => $row['description'],
                'order'       => $orderEdu++, // Ordine sequenziale
            ]);
        }

        $orderExp = 0;
        foreach ($experience as $row) {
            [$start, $end] = $this->splitYears($row['years']);
            Cv::create([
                'user_id'     => 1, // Assegna all'utente principale
                'type'        => 'experience',
                'title'       => $row['title'],
                'time_start'  => $start?->toDateString(),
                'time_end'    => $end?->toDateString(),
                'description' => $row['description'],
                'order'       => $orderExp++, // Ordine sequenziale
            ]);
        }
    }

    /**
     * Converte una stringa tipo "dd/mm/yyyy — dd/mm/yyyy" o "dd/mm/yyyy — In Corso"
     * in [Carbon|null $start, Carbon|null $end], correggendo giorni fuori range al
     * fine mese (es. 31/06 -> 30/06).
     */
    private function splitYears(string $years): array
    {
        [$from, $to] = array_map('trim', explode('-', $years . '-')); // garantisce 2 elementi
        $start = $this->parseItDate($from);
        $end = (strtolower($to) === 'in corso' || $to === '') ? null : $this->parseItDate($to);
        return [$start, $end];
    }

    private function parseItDate(?string $s): ?Carbon
    {
        if (!$s) return null;
        $s = trim($s);

        // 1) d/m/Y (es. 28/07/2025)
        if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})$#', $s, $m)) {
            [, $d, $mth, $y] = $m;
            $d = (int)$d; $mth = (int)$mth; $y = (int)$y;

            // correggi giorno fuori range → ultimo del mese
            $daysInMonth = Carbon::createSafe($y, max(1, min(12, $mth)), 1)->daysInMonth;
            $d = min($d, $daysInMonth);

            return Carbon::createFromDate($y, $mth, $d)->startOfDay();
        }

        // 2) m/Y (es. 09/2009) → assume giorno 1
        if (preg_match('#^(\d{1,2})/(\d{4})$#', $s, $m)) {
            [, $mth, $y] = $m;
            $mth = (int)$mth; $y = (int)$y;
            return Carbon::createFromDate($y, $mth, 1)->startOfDay();
        }

        // 3) YYYY → assume 01/01/YYYY
        if (preg_match('#^(\d{4})$#', $s, $m)) {
            $y = (int)$m[1];
            return Carbon::createFromDate($y, 1, 1)->startOfDay();
        }

        return null;
    }
}