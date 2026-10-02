'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '@/components/AuthModal';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

 
  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#f8fbfe] flex items-center justify-center">
      <AuthModal
        isOpen={isOpen}
        onClose={handleClose}
        onLoginSuccess={() => {}}
        initialMode="reset-password"
      />
    </div>
  );
}