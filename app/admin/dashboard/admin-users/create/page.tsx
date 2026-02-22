'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateUserForm from '@/components/admin/CreateUserForm';
import { createAdminUser } from '@/lib/adminApi';

export default function CreateUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateUser = async (userData: any) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!userData.email || !userData.name || !userData.password || !userData.role) {
        throw new Error('Please fill in all required fields');
      }

      // Validate role is either ADMIN or SUPER_ADMIN
      if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        throw new Error('Invalid role selected');
      }

      // Prepare the data for API
      const apiData = {
        email: userData.email,
        name: userData.name,
        password: userData.password,
        role: userData.role as 'ADMIN' | 'SUPER_ADMIN',
        phone: userData.phone || undefined,
      };

      console.log('Creating admin user with role:', apiData.role);
      
      // Call the API
      const response = await createAdminUser(apiData);
      
      if (response.success) {
        // Show success message with role
        alert(`${apiData.role} user created successfully!`);
        
        // Navigate back to users list with success message and role filter
        router.push('/admin/dashboard/users?success=User created successfully');
      } else {
        throw new Error(response.message || 'Failed to create user');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
      alert(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <CreateUserForm 
      onBack={handleBack}
      onCreateUser={handleCreateUser}
      isSubmitting={isSubmitting}
      error={error}
    />
  );
}