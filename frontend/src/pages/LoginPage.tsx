import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Github, Code2, Zap, Shield, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' })
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const fn = mode === 'login' ? authApi.login : authApi.register
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : form
      const { data } = await fn(payload)
      setAuth(data.user, data.access_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Zap, text: 'Llama 3.1 70B via Groq — zero cost, sub-2s reviews' },
    { icon: Shield, text: 'Security scanning: XSS, SQLi, hardcoded secrets' },
    { icon: Code2, text: 'Streaming Q&A chat about any PR diff' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent)' }}>
            <Code2 size={16} color="#000" />
          </div>
          <span className="font-semibold text-base">CodeReview AI</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4"
            style={{ color: 'var(--text)' }}>
            Ship better code,<br />
            <span style={{ color: 'var(--accent)' }}>automatically.</span>
          </h1>
          <p className="mb-8" style={{ color: 'var(--muted)' }}>
            AI-powered code review agent that catches bugs, security issues, and bad patterns
            before they reach production — completely free.
          </p>
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--accent-dim)' }}>
                  <Icon size={12} style={{ color: 'var(--accent)' }} />
                </div>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Powered by Llama 3.1 70B · ChromaDB · sentence-transformers · 100% free
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent)' }}>
              <Code2 size={16} color="#000" />
            </div>
            <span className="font-semibold">CodeReview AI</span>
          </div>

          <h2 className="text-xl font-semibold mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              style={{ color: 'var(--accent)' }} className="font-medium">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* GitHub OAuth */}
          <button onClick={() => authApi.githubLogin()}
            className="w-full btn-ghost flex items-center justify-center gap-2 mb-4">
            <Github size={16} />
            Continue with GitHub
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <input className="input" placeholder="Full name" value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                <input className="input" placeholder="Username" required value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </>
            )}
            <input className="input" type="email" placeholder="Email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <div className="relative">
              <input className="input pr-10" type={showPass ? 'text' : 'password'}
                placeholder="Password" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--muted)' }}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
