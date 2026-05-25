import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Code2, LayoutDashboard, GitBranch, GitPullRequest,
  User, LogOut, ChevronRight, Zap
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/repositories', icon: GitBranch, label: 'Repositories' },
  { to: '/reviews', icon: GitPullRequest, label: 'Reviews' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="w-56 flex flex-col flex-shrink-0"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent)' }}>
            <Code2 size={14} color="#000" />
          </div>
          <span className="font-semibold text-sm">CodeReview AI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
            return (
              <Link key={to} to={to}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
                style={active
                  ? { background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 500 }
                  : { color: 'var(--muted)' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}>
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Free badge */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <Zap size={11} />
            <span>Llama 3.1 70B · Free</span>
          </div>
        </div>

        {/* User */}
        <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-7 h-7 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.username}</p>
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="flex-shrink-0 p-1 rounded hover:bg-red-500/10 transition-colors"
              style={{ color: 'var(--muted)' }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
