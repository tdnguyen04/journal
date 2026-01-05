import Link from 'next/link';
import { AuthButton } from '@/components/supabase-ui/auth-button';

import { Suspense } from 'react';
import NavbarWrapper from './tri-ui/navbar-wrapper';

export default async function Navbar() {
  return (
    <NavbarWrapper>
      <div className='flex gap-5 items-center font-semibold'>
        <Link href={'/home'}>Journal</Link>
        <Link href={'/settings'} className='text-sm text-muted-foreground hover:text-foreground'>
          Settings
        </Link>
      </div>
      <Suspense>
        <AuthButton />
      </Suspense>
    </NavbarWrapper>
  );
}
