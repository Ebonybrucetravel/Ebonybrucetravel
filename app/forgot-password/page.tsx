'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '@/components/AuthModal';

export default function ForgotPasswordPage() {
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
    <div className="min-h-screen bg-[#f8fbfe]">
      <AuthModal
        isOpen={isOpen}
        onClose={handleClose}
        onLoginSuccess={() => {}}
        initialMode="forgot-password"
      />
    </div>
  );
}