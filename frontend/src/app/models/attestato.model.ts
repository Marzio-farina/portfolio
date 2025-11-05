export interface Attestato {
  id: number;
  title: string;
  issuer?: string | null;
  date?: string | null;
  badgeUrl?: string | null;
  img?: {
    alt?: string;           // Opzionale per compatibilità con dati backend
    src?: string;           // Opzionale per compatibilità
    sizes?: string;
    placeholder?: string | null; // dataURL opzionale
    width?: number;
    height?: number;
  };
}