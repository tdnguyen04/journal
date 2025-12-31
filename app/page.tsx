import PageWrapper from '@/components/tri-ui/page-wrapper';
import Footer from '@/components/tri-ui/footer';
import Navbar from '@/components/navbar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect('/home');
  }
  return (
    <main className='min-h-screen flex flex-col items-center'>
      <PageWrapper className='items-center'>
        <Navbar />
        <Footer />
      </PageWrapper>
    </main>
  );
}
