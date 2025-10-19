// DTO dal backend (ProjectResource)
export interface ProjectDto {
  id: number;
  title: string;
  description: string;
  poster?: string | null;
  video?: string | null;
  category?: { id: number; name?: string | null } | null; // name o title lato API
  technologies?: { id: number; name?: string | null; icon?: string | null }[] | null;
  created_at?: string | null;
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
  category: string;     // <— stringa semplice per la tua UI
  description: string;
  poster: string;       // url o data uri
  video: string;        // url video
  technologies: string; // lista resa in stringa (es. "Angular, Laravel")
};