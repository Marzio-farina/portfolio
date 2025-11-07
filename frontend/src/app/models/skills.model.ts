// ============================================
// SKILLS MODEL - Definizioni Skills per Tastiera 3D
// ============================================

export interface SkillData {
  label: string;
  shortDescription: string;
}

export interface SkillDefinition {
  names: string[];
  label: string;
  shortDescription: string;
}

export interface KeyModification {
  originalKey: string;
  newLabel: string;
  newDescription: string;
  color: string;
  iconUrl: string;
}

// ============================================
// CONFIGURAZIONE SKILLS
// ============================================

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  { names: ['Angular', 'angular'], label: 'Angular', shortDescription: 'Framework TypeScript enterprise-grade per applicazioni web scalabili e performanti' },
  { names: ['react', 'React'], label: 'React 19', shortDescription: 'Libreria per costruire interfacce utente interattive e reattive' },
  { names: ['Laravel', 'laravel'], label: 'Laravel', shortDescription: 'Framework PHP full stack elegante e potente per applicazioni web moderne' },
  { names: ['nodejs', 'NodeJS', 'node', 'Node'], label: 'Node.js', shortDescription: 'Runtime JavaScript per sviluppo backend scalabile e ad alte prestazioni' },
  { names: ['spring', 'Spring', 'springboot'], label: 'Spring Boot', shortDescription: 'Framework Java per creare applicazioni enterprise robuste e scalabili' },
  { names: ['php', 'PHP'], label: 'PHP', shortDescription: 'Linguaggio server-side versatile per lo sviluppo web dinamico' },
  { names: ['java', 'Java'], label: 'Java 21', shortDescription: 'Linguaggio enterprise robusto con supporto moderno e performance elevate' },
  { names: ['csharp', 'CSharp', 'c#', 'C#'], label: 'C#', shortDescription: 'Linguaggio Microsoft versatile per desktop, web, mobile e gaming' },
  { names: ['javascript', 'JavaScript', 'js', 'JS'], label: 'JavaScript', shortDescription: 'Linguaggio di programmazione versatile per web development full-stack' },
  { names: ['mongodb', 'MongoDB', 'mongo'], label: 'MongoDB', shortDescription: 'Database NoSQL flessibile e scalabile per applicazioni moderne' },
  { names: ['postgresql', 'PostgreSQL', 'postgres'], label: 'PostgreSQL', shortDescription: 'Database relazionale avanzato con supporto JSON e funzionalità enterprise' },
  { names: ['mysql', 'MySQL', 'sql'], label: 'MySQL', shortDescription: 'Database relazionale open-source performante e affidabile' },
  { names: ['docker', 'Docker'], label: 'Docker', shortDescription: 'Piattaforma per containerizzazione e deployment di applicazioni scalabili' },
  { names: ['git', 'Git', 'github', 'GitHub'], label: 'Git', shortDescription: 'Sistema di controllo versione distribuito per gestione codice' },
  { names: ['wordpress', 'WordPress', 'wp'], label: 'WordPress', shortDescription: 'CMS più popolare al mondo per siti web e blog' },
  { names: ['typescript', 'TypeScript', 'ts', 'TS'], label: 'TypeScript', shortDescription: 'Superset di JavaScript con tipizzazione statica per codice più robusto' },
  { names: ['vue', 'Vue', 'vuejs'], label: 'Vue.js', shortDescription: 'Framework JavaScript progressivo per interfacce utente moderne' },
  { names: ['tailwind', 'Tailwind', 'tailwindcss'], label: 'Tailwind CSS', shortDescription: 'Framework CSS utility-first per design personalizzati e moderni' },
  { names: ['bootstrap', 'Bootstrap'], label: 'Bootstrap', shortDescription: 'Framework CSS responsive per sviluppo web rapido e mobile-first' },
  { names: ['sass', 'Sass', 'scss', 'SCSS'], label: 'Sass', shortDescription: 'Preprocessore CSS per stili più potenti e manutenibili' },
  { names: ['css', 'CSS'], label: 'CSS3', shortDescription: 'Linguaggio di stile per design web moderno e responsive' },
  { names: ['html', 'HTML'], label: 'HTML5', shortDescription: 'Linguaggio di markup per strutture web semantiche e accessibili' },
  { names: ['vite', 'Vite'], label: 'Vite', shortDescription: 'Build tool ultra-veloce per progetti frontend moderni' },
  { names: ['nextjs', 'Next', 'next', 'Next.js'], label: 'Next.js', shortDescription: 'Framework React con rendering server-side e generazione statica' },
  { names: ['nuxt', 'Nuxt', 'nuxtjs'], label: 'Nuxt.js', shortDescription: 'Framework Vue.js per applicazioni universali e statiche' },
  { names: ['firebase', 'Firebase'], label: 'Firebase', shortDescription: 'Piattaforma Google per sviluppo rapido di applicazioni mobile e web' },
  { names: ['aws', 'AWS', 'amazon'], label: 'AWS', shortDescription: 'Piattaforma cloud computing leader per servizi scalabili' },
  { names: ['azure', 'Azure'], label: 'Azure', shortDescription: 'Piattaforma cloud Microsoft per soluzioni enterprise' },
  { names: ['vercel', 'Vercel'], label: 'Vercel', shortDescription: 'Piattaforma di deployment per frontend con preview istantanee' },
  { names: ['netlify', 'Netlify'], label: 'Netlify', shortDescription: 'Piattaforma JAMstack per deploy automatico e CDN globale' },
  { names: ['vim', 'Vim', 'vi'], label: 'Vim', shortDescription: 'Editor di testo potente e altamente configurabile' },
  { names: ['vscode', 'VSCode', 'code'], label: 'VS Code', shortDescription: 'Editor di codice Microsoft con supporto estensioni' },
  { names: ['redis', 'Redis'], label: 'Redis', shortDescription: 'Database in-memory per caching e message broker' },
  { names: ['graphql', 'GraphQL'], label: 'GraphQL', shortDescription: 'Linguaggio di query per API moderne e flessibili' },
  { names: ['express', 'Express', 'expressjs'], label: 'Express.js', shortDescription: 'Framework minimalista per applicazioni web Node.js' },
  { names: ['nestjs', 'NestJS', 'nest'], label: 'NestJS', shortDescription: 'Framework Node.js progressivo per applicazioni scalabili' },
  { names: ['svelte', 'Svelte'], label: 'Svelte', shortDescription: 'Framework reattivo che compila componenti in JavaScript vanilla' },
  { names: ['redux', 'Redux'], label: 'Redux', shortDescription: 'Libreria per gestione dello stato prevedibile' },
  { names: ['webpack', 'Webpack'], label: 'Webpack', shortDescription: 'Module bundler potente per applicazioni JavaScript' },
  { names: ['babel', 'Babel'], label: 'Babel', shortDescription: 'Compilatore JavaScript per compatibilità browser moderna' },
  { names: ['npm', 'NPM'], label: 'NPM', shortDescription: 'Package manager per Node.js e gestione dipendenze' },
  { names: ['nginx', 'Nginx', 'NGINX'], label: 'Nginx', shortDescription: 'Web server ad alte prestazioni e reverse proxy' },
  { names: ['linux', 'Linux'], label: 'Linux', shortDescription: 'Sistema operativo open-source per server e sviluppo' },
  { names: ['prettier', 'Prettier'], label: 'Prettier', shortDescription: 'Code formatter automatico per codice consistente' }
];

// ============================================
// CONFIGURAZIONE MODIFICHE TASTI
// ============================================

export const KEY_MODIFICATIONS: KeyModification[] = [
  {
    originalKey: 'Angular',
    newLabel: 'Angular',
    newDescription: 'Framework TypeScript enterprise-grade per applicazioni web scalabili e performanti',
    color: '#FFFFFF',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg'
  },
  {
    originalKey: 'mongodb',
    newLabel: 'PHP',
    newDescription: 'Linguaggio server-side versatile per lo sviluppo web dinamico',
    color: '#777BB4',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg'
  },
  {
    originalKey: 'wordpress',
    newLabel: 'Laravel',
    newDescription: 'Framework PHP full stack elegante e potente per applicazioni web moderne',
    color: '#FFFFFF',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-original.svg'
  }
];

// ============================================
// CONFIGURAZIONE OGGETTI DA IGNORARE
// ============================================

export const IGNORE_OBJECTS = ['body', 'platform', 'keyboard', 'base', 'Camera', 'Light', 'Scene'];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Crea una mappa di skills con tutti i possibili nomi come chiavi
 */
export function createSkillsDataMap(definitions: SkillDefinition[]): Record<string, SkillData> {
  const map: Record<string, SkillData> = {};
  definitions.forEach(skill => {
    const data = { label: skill.label, shortDescription: skill.shortDescription };
    skill.names.forEach(name => {
      map[name] = data;
    });
  });
  return map;
}

/**
 * Applica le modifiche ai dati delle skills (per tasti che cambiano identità)
 */
export function applyKeyModifications(
  skillsData: Record<string, SkillData>, 
  modifications: KeyModification[]
): void {
  modifications.forEach(mod => {
    const variants = [mod.originalKey, mod.originalKey.toLowerCase(), mod.originalKey.toUpperCase()];
    variants.forEach(variant => {
      skillsData[variant] = {
        label: mod.newLabel,
        shortDescription: mod.newDescription
      };
    });
  });
}
