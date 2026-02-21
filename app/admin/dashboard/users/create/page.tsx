// app/admin/users/create/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CreateUserForm from '@/components/admin/CreateUserForm';

export default function CreateUserPage() {
  const router = useRouter();

  const handleCreateUser = (userData: any) => {
    // Handle the user creation
    console.log('New user:', userData);
    
    // You would typically:
    // 1. Save to your backend/state
    // 2. Show success message
    // 3. Navigate back to users list
    
    alert('User created successfully!');
    router.push('/admin/users'); // or router.back()
  };

  const handleBack = () => {
    router.back(); // or router.push('/admin/users')
  };

  return (
    <CreateUserForm 
      onBack={handleBack}
      onCreateUser={handleCreateUser}
    />
  );
}