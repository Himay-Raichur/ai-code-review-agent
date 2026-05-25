import { useState } from 'react'
import { User, Github, Key, Save } from 'lucide-react'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/dashboard/Layout'

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore()
  const [form, setForm] = useState({ full_name: user?.full_name || '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await authApi.update(form)
      setAuth(data, token!)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-xl space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold">Profile Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Manage your account and integrations
          </p>
        </div>

        {/* Avatar + info */}
        <div className="card p-5">
          <div className="flex items-center gap-4 mb-5">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar"
                className="w-14 h-14 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium">{user?.username}</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{user?.email}</p>
              {user?.is_admin && (
                <span className="badge badge-info text-xs mt-1">Admin</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--muted)' }}>Full name</label>
              <input className="input" placeholder="Your name"
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--muted)' }}>Email</label>
              <input className="input" value={user?.email || ''} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
          </div>

          <button onClick={save} disabled={saving} className="btn-primary mt-4">
            <Save size={14} />
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>

        {/* GitHub connection */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Github size={18} />
            <div>
              <p className="font-medium text-sm">GitHub Integration</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {user?.github_id ? `Connected as @${user.username}` : 'Not connected'}
              </p>
            </div>
            <div className="ml-auto">
              <span className={`badge ${user?.github_id ? 'badge-low' : 'badge-high'}`}>
                {user?.github_id ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          {!user?.github_id && (
            <button onClick={() => authApi.githubLogin()} className="btn-ghost text-sm">
              <Github size={14} /> Connect GitHub
            </button>
          )}
        </div>

        {/* API Info */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} style={{ color: 'var(--muted)' }} />
            <p className="text-sm font-medium">Stack Info</p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'LLM Model', value: 'Llama 3.1 70B (Groq)' },
              { label: 'Embeddings', value: 'all-MiniLM-L6-v2 (local)' },
              { label: 'Vector DB', value: 'ChromaDB (local)' },
              { label: 'Cost', value: 'Free ✓' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{label}</span>
                <span className="text-sm font-mono"
                  style={{ color: value.includes('Free') ? 'var(--accent)' : 'var(--text)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
