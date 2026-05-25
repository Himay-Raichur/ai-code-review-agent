import axios from 'axios'

export const api = axios.create({
  baseURL: 'import.meta.env.VITE_API_URL',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  update: (data: any) => api.patch('/auth/me', data),
  githubLogin: () => { window.location.href = '/api/v1/auth/github/login' },
}

// Repositories
export const repoApi = {
  list: () => api.get('/repositories/'),
  listGitHub: () => api.get('/repositories/github'),
  add: (data: any) => api.post('/repositories/', data),
  get: (id: number) => api.get(`/repositories/${id}`),
  update: (id: number, data: any) => api.patch(`/repositories/${id}`, data),
  remove: (id: number) => api.delete(`/repositories/${id}`),
  setupWebhook: (id: number) => api.post(`/repositories/${id}/webhook`),
}

// Reviews
export const reviewApi = {
  trigger: (data: any) => api.post('/reviews/trigger', data),
  list: (skip = 0, limit = 20) => api.get(`/reviews/?skip=${skip}&limit=${limit}`),
  get: (id: number) => api.get(`/reviews/${id}`),
  analytics: () => api.get('/reviews/analytics'),
  getChatHistory: (id: number) => api.get(`/reviews/${id}/chat`),
  search: (q: string, repo?: string) =>
    api.get(`/reviews/search/semantic?q=${encodeURIComponent(q)}${repo ? `&repo=${repo}` : ''}`),
}

// Streaming chat
export async function streamChat(
  reviewId: number,
  content: string,
  onChunk: (chunk: string) => void,
  onDone: () => void
) {
  const token = localStorage.getItem('token')
  const response = await fetch(`/api/v1/reviews/${reviewId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') { onDone(); return }
        onChunk(data)
      }
    }
  }
}
