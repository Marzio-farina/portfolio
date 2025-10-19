export interface CvDto {
  id: number;
  title: string;
  years: string;           // "dd/mm/yyyy — In Corso"
  description: string;
  time_start: string;      // "YYYY-MM-DD"
  time_end: string | null; // "YYYY-MM-DD" | null
  is_current: boolean;
  type: 'education' | 'experience';
}

export interface CvResponse {
  education: CvDto[];
  experience: CvDto[];
}