export interface TestimonialIcon {
  id: number;
  img: string;
  alt: string;
}

export interface Testimonial {
  id: string;
  author: string;
  text: string;
  role?: string;
  company?: string;
  rating: number;
  isFromUser?: boolean;
  isFromVisitor?: boolean;
  avatar?: string | null;
  icon?: TestimonialIcon | null;
  createdAt?: string;
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
