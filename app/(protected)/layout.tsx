import PageWrapper from '@/components/tri-ui/page-wrapper';
import Footer from '@/components/tri-ui/footer';
import SectionsWrapper from '@/components/tri-ui/sections-wrapper';
import Navbar from '@/components/navbar';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className='min-h-screen flex flex-col items-center'>
      <PageWrapper className='items-center'>
        <Navbar />
        <SectionsWrapper>{children}</SectionsWrapper>
        <Footer />
      </PageWrapper>
    </main>
  );
}
