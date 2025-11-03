// DTO dal backend (ProjectResource)
export interface ProjectDto {
  id: number;
  title: string;
  description: string;
  poster?: string | null;
  video?: string | null;
  category?: { id: number; name?: string | null } | null; // name o title lato API
  technologies?: { id: number; name?: string | null; title?: string | null; description?: string | null; icon?: string | null }[] | null;
  created_at?: string | null;
  layout_config?: string | null; // Configurazione JSON per il layout della griglia
}

export interface Paginated<T> {
  data: T[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

// Modello UI che usi in Progetti/ProgettiCard
export type Progetto = {
  id: number;
  title: string;
  category: string;     // <— stringa semplice per la tua UI (es: "Web")
  category_id?: number | null; // <— ID categoria dal backend per API calls
  description: string;
  poster: string;       // url o data uri
  video: string;        // url video
  technologies: Technology[]; // array di tecnologie per i tag
  technologiesString?: string; // stringa per retrocompatibilità (opzionale)
  layout_config?: Record<string, { left: number; top: number; width: number; height: number }> | null; // Configurazione layout con absolute positioning
};

export interface Technology {
  id: number;
  title: string;
  description?: string | null;
}