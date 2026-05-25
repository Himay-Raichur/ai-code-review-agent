import { useEffect, useState } from 'react'
import { Plus, GitBranch, Webhook, Settings, Trash2, Lock, Globe, Star, RefreshCw, Play } from 'lucide-react'
import { repoApi, reviewApi } from '@/services/api'
import type { Repository, GitHubRepo } from '@/types'
import Layout from '@/components/dashboard/Layout'
import { useNavigate } from 'react-router-dom'

function AddRepoModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    repoApi.listGitHub().then(r => {
      setGithubRepos(Array.isArray(r.data) ? r.data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const add = async (r: GitHubRepo) => {
    setAdding(r.id)
    try {
      await repoApi.add({
        github_repo_id: String(r.id),
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        language: r.language,
        is_private: r.private,
      })
      onAdd()
      onClose()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to add')
    } finally {
      setAdding(null)
    }
  }

  const filtered = githubRepos.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="card w-full max-w-lg" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-medium">Add Repository</h2>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--muted)' }}>Close</button>
        </div>
        <div className="p-4">
          <input className="input" placeholder="Search repositories..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>
              {githubRepos.length === 0
                ? 'Connect GitHub to see your repositories'
                : 'No repositories match your search'}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                  style={{ border: '1px solid var(--border)' }}>
                  {r.private ? <Lock size={12} style={{ color: 'var(--muted)' }} /> : <Globe size={12} style={{ color: 'var(--muted)' }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.full_name}</p>
                    {r.language && <p className="text-xs" style={{ color: 'var(--muted)' }}>{r.language}</p>}
                  </div>
                  {r.stargazers_count > 0 && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                      <Star size={10} /> {r.stargazers_count}
                    </div>
                  )}
                  <button onClick={() => add(r)} disabled={adding === r.id} className="btn-primary text-xs px-3 py-1.5">
                    {adding === r.id ? '...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TriggerReviewModal({ repo, onClose }: { repo: Repository; onClose: () => void }) {
  const [prNumber, setPrNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const trigger = async () => {
    if (!prNumber) return
    setLoading(true)
    try {
      await reviewApi.trigger({ repo_full_name: repo.full_name, pr_number: Number(prNumber) })
      onClose()
      navigate('/reviews')
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to trigger review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="card w-full max-w-sm p-5">
        <h2 className="font-medium mb-1">Trigger Review</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{repo.full_name}</p>
        <label className="text-xs mb-1.5 block" style={{ color: 'var(--muted)' }}>PR Number</label>
        <input className="input mb-4" type="number" placeholder="e.g. 42" value={prNumber}
          onChange={e => setPrNumber(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && trigger()} />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button onClick={trigger} disabled={loading || !prNumber} className="btn-primary flex-1 justify-center">
            {loading ? 'Starting...' : 'Review PR'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [triggerRepo, setTriggerRepo] = useState<Repository | null>(null)
  const [webhookLoading, setWebhookLoading] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    repoApi.list().then(r => { setRepos(r.data); setLoading(false) })
  }

  useEffect(load, [])

  const setupWebhook = async (repo: Repository) => {
    setWebhookLoading(repo.id)
    try {
      await repoApi.setupWebhook(repo.id)
      load()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Webhook setup failed')
    } finally {
      setWebhookLoading(null)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Remove this repository?')) return
    await repoApi.remove(id)
    load()
  }

  const LANG_COLORS: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3572a5',
    Go: '#00add8', Rust: '#dea584', Java: '#b07219',
  }

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Repositories</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              Manage connected repos and webhooks
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add Repo
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : repos.length === 0 ? (
          <div className="card p-12 text-center">
            <GitBranch size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
            <h2 className="font-medium mb-1">No repositories yet</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Add a GitHub repository to start getting AI code reviews
            </p>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> Add your first repo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {repos.map(repo => (
              <div key={repo.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {repo.is_private
                      ? <Lock size={12} style={{ color: 'var(--muted)' }} />
                      : <Globe size={12} style={{ color: 'var(--muted)' }} />}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{repo.full_name}</p>
                      {repo.description && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {repo.language && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${LANG_COLORS[repo.language] || '#6b6b80'}20`, color: LANG_COLORS[repo.language] || 'var(--muted)' }}>
                        {repo.language}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5 text-xs"
                    style={{ color: repo.webhook_active ? 'var(--accent)' : 'var(--muted)' }}>
                    <Webhook size={12} />
                    {repo.webhook_active ? 'Webhook active' : 'No webhook'}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                    {repo.review_style}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setTriggerRepo(repo)} className="btn-primary text-xs px-3 py-1.5">
                    <Play size={12} /> Review PR
                  </button>
                  {!repo.webhook_active && (
                    <button onClick={() => setupWebhook(repo)} disabled={webhookLoading === repo.id}
                      className="btn-ghost text-xs px-3 py-1.5">
                      <Webhook size={12} />
                      {webhookLoading === repo.id ? 'Setting up...' : 'Setup webhook'}
                    </button>
                  )}
                  <button onClick={() => remove(repo.id)} className="ml-auto p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    style={{ color: 'var(--muted)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddRepoModal onClose={() => setShowAdd(false)} onAdd={load} />}
      {triggerRepo && <TriggerReviewModal repo={triggerRepo} onClose={() => setTriggerRepo(null)} />}
    </Layout>
  )
}
