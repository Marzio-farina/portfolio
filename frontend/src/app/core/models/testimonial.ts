export interface Testimonial {
  id: string;
  author: string;
  text: string;
  role?: string;
  company?: string;
  rating: number;
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
