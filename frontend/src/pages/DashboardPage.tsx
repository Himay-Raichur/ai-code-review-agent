import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { GitPullRequest, Shield, AlertTriangle, Star, Plus, ChevronRight, Zap } from 'lucide-react'
import { reviewApi } from '@/services/api'
import type { Analytics, Review } from '@/types'
import { format } from 'date-fns'
import Layout from '@/components/dashboard/Layout'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f87171', high: '#fb923c', medium: '#facc15', low: '#4ade80', info: '#60a5fa',
}

function ScoreRing({ score }: { score: number }) {
  const cls = score >= 7 ? 'score-high' : score >= 4 ? 'score-mid' : 'score-low'
  return <div className={`score-ring ${cls}`}>{score.toFixed(1)}</div>
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold mb-0.5">{value}</p>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([reviewApi.analytics(), reviewApi.list(0, 5)]).then(([aRes, rRes]) => {
      setAnalytics(aRes.data)
      setReviews(rRes.data)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    </Layout>
  )

  const severityData = analytics ? Object.entries(analytics.issues_by_severity).map(([name, value]) => ({
    name, value, fill: SEVERITY_COLORS[name] || '#6b6b80'
  })) : []

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              AI code review activity at a glance
            </p>
          </div>
          <Link to="/repositories" className="btn-primary">
            <Plus size={16} /> Add Repository
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={GitPullRequest} label="Total Reviews" value={analytics?.total_reviews ?? 0}
            color="#22c55e" />
          <StatCard icon={AlertTriangle} label="Issues Found" value={analytics?.total_issues_found ?? 0}
            color="#fb923c" />
          <StatCard icon={Shield} label="Security Flags" value={analytics?.total_security_flags ?? 0}
            color="#f87171" />
          <StatCard icon={Star} label="Avg Score" value={`${analytics?.avg_score ?? 0}/10`}
            color="#facc15" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity chart */}
          <div className="card p-5 lg:col-span-2">
            <h2 className="text-sm font-medium mb-4">Reviews over time</h2>
            {analytics?.reviews_by_day.length ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={analytics.reviews_by_day}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b6b80' }}
                    tickFormatter={d => format(new Date(d), 'MMM d')} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b6b80' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#111118', border: '1px solid #1e1e2a', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={d => format(new Date(d), 'MMM d, yyyy')}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center"
                style={{ color: 'var(--muted)' }}>
                <div className="text-center">
                  <Zap size={24} className="mx-auto mb-2" />
                  <p className="text-sm">No reviews yet. Trigger your first one!</p>
                </div>
              </div>
            )}
          </div>

          {/* Issues by severity */}
          <div className="card p-5">
            <h2 className="text-sm font-medium mb-4">By severity</h2>
            {severityData.length ? (
              <>
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie data={severityData} cx="50%" cy="50%" outerRadius={45}
                      innerRadius={25} dataKey="value">
                      {severityData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {severityData.map(({ name, value, fill }) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: fill }} />
                        <span style={{ color: 'var(--muted)' }} className="capitalize">{name}</span>
                      </div>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center"
                style={{ color: 'var(--muted)' }}>
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent reviews */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-medium">Recent Reviews</h2>
            <Link to="/reviews" className="text-xs" style={{ color: 'var(--accent)' }}>View all</Link>
          </div>
          {reviews.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>
              <GitPullRequest size={28} className="mx-auto mb-2" />
              <p className="text-sm">No reviews yet. Add a repository and trigger your first review.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {reviews.map(r => (
                <Link key={r.id} to={`/reviews/${r.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  {r.overall_score != null && <ScoreRing score={r.overall_score} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.pull_request?.title || `Review #${r.id}`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {r.pull_request?.author && `by ${r.pull_request.author} · `}
                      {format(new Date(r.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge badge-${r.status === 'completed' ? 'low' : r.status === 'failed' ? 'critical' : 'info'}`}>
                      {r.status}
                    </span>
                    {r.issues?.length > 0 && (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {r.issues.length} issues
                      </span>
                    )}
                    <ChevronRight size={14} style={{ color: 'var(--muted)' }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
