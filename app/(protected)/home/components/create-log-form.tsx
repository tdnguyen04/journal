'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createLog } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const initialState = {
  success: false,
  message: '',
};

export function CreateLogForm() {
  // 1. Hook into the Server Action
  const [state, formAction, isPending] = useActionState(
    createLog,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const [isVisible, setIsVisible] = useState(false);

  // 2. Auto-clear form on success
  useEffect(() => {
    if (state.message) {
      setIsVisible(true);
      if (state.success && formRef.current) {
        formRef.current.reset();
      }
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className='flex flex-col gap-2 w-full mb-8'
    >
      <div className='flex gap-2'>
        <Input
          name='content'
          placeholder='Log your progress...'
          disabled={isPending}
          required
          className='bg-card'
        />
        <Button type='submit' disabled={isPending}>
          {isPending ? <Loader2 className='animate-spin w-4 h-4' /> : 'Save'}
        </Button>
      </div>

      {/* 3. Feedback Message */}
      {isVisible && state.message && (
        <p
          className={`text-xs px-1 transition-opacity duration-500 ${state.success ? 'text-green-500' : 'text-red-500'}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
