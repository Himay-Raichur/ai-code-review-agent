import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitPullRequest, ChevronRight, Search, Filter } from 'lucide-react'
import { reviewApi } from '@/services/api'
import type { Review } from '@/types'
import { format } from 'date-fns'
import Layout from '@/components/dashboard/Layout'

function ScoreRing({ score }: { score: number }) {
  const cls = score >= 7 ? 'score-high' : score >= 4 ? 'score-mid' : 'score-low'
  return <div className={`score-ring ${cls}`} style={{ width: 44, height: 44, fontSize: 13 }}>{score.toFixed(1)}</div>
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all')

  useEffect(() => {
    reviewApi.list(0, 50).then(r => {
      setReviews(r.data)
      setLoading(false)
    })
  }, [])

  const filtered = reviews.filter(r => {
    const matchSearch = !search ||
      r.pull_request?.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.pull_request?.author?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || r.status === filter
    return matchSearch && matchFilter
  })

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold">All Reviews</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {reviews.length} total reviews
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted)' }} />
            <input className="input pl-8 text-sm" placeholder="Search reviews..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {(['all', 'completed', 'failed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-xs px-3 py-1.5 rounded-md transition-all capitalize"
                style={filter === f
                  ? { background: 'var(--accent)', color: '#000', fontWeight: 600 }
                  : { color: 'var(--muted)' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <GitPullRequest size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
            <h2 className="font-medium mb-1">No reviews found</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {search ? 'Try a different search term' : 'Trigger a review from the Repositories page'}
            </p>
          </div>
        ) : (
          <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
            {filtered.map(r => {
              const critical = (r.issues || []).filter(i => i.severity === 'critical').length
              const high = (r.issues || []).filter(i => i.severity === 'high').length
              return (
                <Link key={r.id} to={`/reviews/${r.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  {r.overall_score != null
                    ? <ScoreRing score={r.overall_score} />
                    : (
                      <div className="w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: 'var(--border)' }}>
                        <div className={r.status === 'processing'
                          ? 'w-4 h-4 rounded-full border-2 animate-spin'
                          : ''} style={{ borderColor: 'var(--muted)', borderTopColor: 'transparent' }} />
                      </div>
                    )
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.pull_request?.title || `Review #${r.id}`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {r.pull_request?.author && `${r.pull_request.author} · `}
                      {r.pull_request?.github_pr_number && `PR #${r.pull_request.github_pr_number} · `}
                      {format(new Date(r.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {critical > 0 && (
                      <span className="badge badge-critical">{critical} critical</span>
                    )}
                    {high > 0 && (
                      <span className="badge badge-high">{high} high</span>
                    )}
                    {r.security_flags?.length > 0 && (
                      <span className="badge badge-security">{r.security_flags.length} sec</span>
                    )}
                    <span className={`badge badge-${r.status === 'completed' ? 'low' : r.status === 'failed' ? 'critical' : 'info'}`}>
                      {r.status}
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--muted)' }} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
