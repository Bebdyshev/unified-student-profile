'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Старый URL: перенаправление на вкладку панели учителя */
export default function TeacherSubjectGroupsLegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/teacher?tab=subject-groups');
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
      Переход на панель учителя…
    </div>
  );
}
