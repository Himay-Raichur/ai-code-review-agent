import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/services/api'
import { Code2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const [params] = useSearchParams()
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (!token) { navigate('/login'); return }
    localStorage.setItem('token', token)
    authApi.me().then(({ data }) => {
      setAuth(data, token)
      navigate('/dashboard')
    }).catch(() => navigate('/login'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--accent)' }}>
          <Code2 size={20} color="#000" />
        </div>
        <div className="w-5 h-5 rounded-full border-2 animate-spin mx-auto"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm mt-3" style={{ color: 'var(--muted)' }}>Signing you in...</p>
      </div>
    </div>
  )
}
