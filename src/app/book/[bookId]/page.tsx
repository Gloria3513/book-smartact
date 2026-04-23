import { createServerSupabaseClient } from '@/lib/supabase-server';
import FlipbookViewer from '@/components/FlipbookViewer';
import { notFound } from 'next/navigation';
import type { Book } from '@/types';

interface PageProps {
  params: Promise<{ bookId: string }>;
}

export default async function BookPage({ params }: PageProps) {
  const { bookId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: book } = await supabase
    .from('book_items')
    .select('*')
    .eq('id', bookId)
    .single<Book>();

  if (!book) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <FlipbookViewer pdfUrl={book.pdf_url} title={book.title} />
    </div>
  );
}
