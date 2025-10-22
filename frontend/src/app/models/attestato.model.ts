export interface Attestato {
  id: number;
  title: string;
  issuer?: string | null;
  date?: string | null;
  badgeUrl?: string | null;

  img: {
    alt: string;
    src: string;        // /i/<path> (originale webp)
    sizes?: string;
    placeholder?: string | null; // dataURL opzionale
    width?: number;
    height?: number;
  };
}