 'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/landing/header'
import CTA from '@/components/landing/cta'
import api from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const redirectIfAuthorized = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setCheckingAuth(false)
        return
      }

      try {
        const userInfo = await api.getCurrentUser()
        if (userInfo.type === 'teacher') {
          router.replace('/dashboard/teacher')
          return
        }
        router.replace('/dashboard')
      } catch {
        localStorage.removeItem('access_token')
        setCheckingAuth(false)
      }
    }

    redirectIfAuthorized()
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Проверка авторизации...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow">
        <CTA />
      </main>
    </div>
  );
}