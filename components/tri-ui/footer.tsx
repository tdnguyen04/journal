import { ThemeSwitcher } from './theme-switcher';

export default async function Footer() {
  return (
    <footer className='w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16'>
      <p>
        A product of{' '}
        <a
          href=''
          target='_blank'
          className='font-bold hover:underline'
          rel='noreferrer'
        >
          Tri Nguyen
        </a>
      </p>
      <ThemeSwitcher />
    </footer>
  );
}
