'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import AppSidebar from '@/components/layout/app-sidebar';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated && !authLoading) {
        try {
          const userData = await api.getCurrentUser();
          setUser(userData);
        } catch (error) {
          router.push('/signin');
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!loading && user && user.type !== 'teacher' && user.type !== 'admin') {
      toast.error('Доступ запрещен. Только учителя могут просматривать эту страницу.');
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.type !== 'teacher' && user.type !== 'admin')) {
    return null;
  }

  return (
    <div className="h-screen bg-white-950">
      <AppSidebar>{children}</AppSidebar>
    </div>
  );
}
