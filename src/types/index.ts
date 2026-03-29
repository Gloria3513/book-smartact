export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Library {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  share_code: string;
  owner_id: string;
  is_public: boolean;
  password: string | null;
  created_at: string;
  updated_at: string;
  book_items?: Book[];
  owner?: User;
}

export interface Book {
  id: string;
  library_id: string;
  title: string;
  cover_image: string | null;
  pdf_url: string;
  page_count: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
