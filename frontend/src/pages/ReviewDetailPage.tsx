import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Shield, Bug, Zap, FileText, ChevronDown, ChevronUp, Send, MessageSquare, CheckCircle, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { reviewApi, streamChat } from '@/services/api'
import type { Review, ChatMessage } from '@/types'
import { format } from 'date-fns'
import Layout from '@/components/dashboard/Layout'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']
const TYPE_ICONS: any = { bug: Bug, security: Shield, performance: Zap, documentation: FileText, style: Sparkles }

function IssueCard({ issue }: { issue: any }) {
  const [open, setOpen] = useState(false)
  const Icon = TYPE_ICONS[issue.type] || Bug
  return (
    <div className="card mb-2 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors">
        <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
            <span className={`badge badge-${issue.type}`}>{issue.type}</span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              {issue.file}{issue.line ? `:${issue.line}` : ''}
            </span>
          </div>
          <p className="text-sm mt-1">{issue.message}</p>
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted)' }} />}
      </button>
      {open && issue.suggestion && (
        <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-medium mb-1 mt-3" style={{ color: 'var(--accent)' }}>Suggestion</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{issue.suggestion}</p>
        </div>
      )}
    </div>
  )
}

function ChatPanel({ review }: { review: Review }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    reviewApi.getChatHistory(review.id).then(r => setMessages(r.data))
  }, [review.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const send = async () => {
    if (!input.trim() || streaming) return
    const text = input
    setInput('')
    setStreaming(true)
    setStreamingText('')
    setMessages(m => [...m, { id: Date.now(), role: 'user', content: text, created_at: new Date().toISOString() }])

    let full = ''
    await streamChat(
      review.id, text,
      (chunk) => { full += chunk; setStreamingText(full) },
      () => {
        setMessages(m => [...m, { id: Date.now() + 1, role: 'assistant', content: full, created_at: new Date().toISOString() }])
        setStreamingText('')
        setStreaming(false)
      }
    )
  }

  return (
    <div className="card flex flex-col h-96">
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <MessageSquare size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-medium">Ask about this PR</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !streaming && (
          <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
            <MessageSquare size={20} className="mx-auto mb-2" />
            <p className="text-sm">Ask anything about this code change</p>
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {['What are the most critical issues?', 'How do I fix the security flags?', 'Explain the changes in this PR'].map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${m.role === 'user'
              ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
              style={m.role === 'user'
                ? { background: 'var(--accent)', color: '#000' }
                : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <ReactMarkdown className="prose-sm">{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {streaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-bl-sm text-sm typing-cursor"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <ReactMarkdown>{streamingText}</ReactMarkdown>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <input className="input flex-1 text-sm" placeholder="Ask about the code..."
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()} />
        <button onClick={send} disabled={streaming || !input.trim()} className="btn-primary px-3">
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [review, setReview] = useState<Review | null>(null)
  const [tab, setTab] = useState<'issues' | 'security' | 'suggestions'>('issues')

  useEffect(() => {
    if (!id) return
    const load = () => reviewApi.get(Number(id)).then(r => {
      setReview(r.data)
      if (r.data.status === 'processing') setTimeout(load, 2000)
    })
    load()
  }, [id])

  if (!review) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    </Layout>
  )

  const pr = review.pull_request
  const sortedIssues = [...(review.issues || [])].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )
  const score = review.overall_score ?? 0
  const scoreClass = score >= 7 ? 'score-high' : score >= 4 ? 'score-mid' : 'score-low'

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        {/* PR header */}
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className={`score-ring ${scoreClass} flex-shrink-0`}>
              {review.status === 'processing' ? (
                <div className="w-5 h-5 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} />
              ) : score.toFixed(1)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-base font-semibold truncate">
                  {pr?.title || `Review #${review.id}`}
                </h1>
                <span className={`badge badge-${review.status === 'completed' ? 'low' : review.status === 'failed' ? 'critical' : 'info'}`}>
                  {review.status}
                </span>
              </div>
              {pr && (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  PR #{pr.github_pr_number} · {pr.author} · {pr.base_branch} ← {pr.head_branch}
                  {' · '}
                  <span style={{ color: '#4ade80' }}>+{pr.additions}</span>
                  {' '}
                  <span style={{ color: '#f87171' }}>-{pr.deletions}</span>
                  {' · '}
                  {pr.changed_files} files
                </p>
              )}
              {review.summary && (
                <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{review.summary}</p>
              )}
            </div>
          </div>

          {review.status === 'processing' && (
            <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              Analyzing with Llama 3.1 70B...
            </div>
          )}
        </div>

        {review.status === 'completed' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: issues */}
            <div className="lg:col-span-2 space-y-4">
              {/* Positive notes */}
              {review.positive_notes?.length > 0 && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={14} style={{ color: 'var(--accent)' }} />
                    <span className="text-sm font-medium">Looks good</span>
                  </div>
                  <ul className="space-y-1">
                    {review.positive_notes.map((n, i) => (
                      <li key={i} className="text-sm" style={{ color: 'var(--muted)' }}>✓ {n}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tabs */}
              <div>
                <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ background: 'var(--surface)' }}>
                  {(['issues', 'security', 'suggestions'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className="flex-1 text-xs py-1.5 rounded-md transition-all capitalize"
                      style={tab === t
                        ? { background: 'var(--accent)', color: '#000', fontWeight: 600 }
                        : { color: 'var(--muted)' }}>
                      {t === 'issues' && `Issues (${review.issues?.length || 0})`}
                      {t === 'security' && `Security (${review.security_flags?.length || 0})`}
                      {t === 'suggestions' && `Tips (${review.suggestions?.length || 0})`}
                    </button>
                  ))}
                </div>

                {tab === 'issues' && (
                  <div>
                    {sortedIssues.length === 0
                      ? <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>No issues found 🎉</p>
                      : sortedIssues.map((issue, i) => <IssueCard key={i} issue={issue} />)
                    }
                  </div>
                )}

                {tab === 'security' && (
                  <div>
                    {!review.security_flags?.length
                      ? <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>No security flags found ✅</p>
                      : review.security_flags.map((f: any, i: number) => (
                        <div key={i} className="card mb-2 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="badge badge-critical">{f.vulnerability}</span>
                            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{f.file}</span>
                          </div>
                          <p className="text-sm mb-2">{f.description}</p>
                          <p className="text-xs" style={{ color: 'var(--accent)' }}>Fix: {f.fix}</p>
                        </div>
                      ))
                    }
                  </div>
                )}

                {tab === 'suggestions' && (
                  <div className="space-y-2">
                    {!review.suggestions?.length
                      ? <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>No suggestions</p>
                      : review.suggestions.map((s, i) => (
                        <div key={i} className="card p-4 flex gap-3">
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 10, fontWeight: 700 }}>
                            {i + 1}
                          </div>
                          <p className="text-sm">{s}</p>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Right: Chat */}
            <div>
              <ChatPanel review={review} />
              <div className="mt-3 card p-3">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Model: <span className="font-mono">{review.model_used}</span>
                  {review.processing_time_ms && ` · ${(review.processing_time_ms / 1000).toFixed(1)}s`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
