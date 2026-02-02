'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { UserManagement } from '@/app/(user)/dashboard/classes/_components/user-management';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-toastify';
import api from '@/lib/api';

export default function UsersManagementPage() {
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
    if (!loading && user && user.type !== 'admin') {
      toast.error('Доступ запрещен. Только администраторы могут управлять пользователями.');
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || authLoading) {
    return (
      <PageContainer scrollable>
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <p className="text-gray-500">Загрузка...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!user || user.type !== 'admin') {
    return null;
  }

  return (
    <PageContainer scrollable>
      <div className="py-4">
        <UserManagement />
      </div>
    </PageContainer>
  );
}
