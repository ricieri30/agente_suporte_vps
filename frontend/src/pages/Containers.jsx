import { useState, useEffect, useCallback } from 'react'
import {
  Box, RefreshCw, Play, Square, RotateCw, Search,
  Terminal, LineChart, X, Cpu, MemoryStick, Circle
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || '/api'
const C = { green: '#22c55e', amber: '#f59e0b' }

function StateDot({ state }) {
  const color = state === 'running' ? '#22c55e' : state === 'exited' ? '#ef4444' : '#94a3b8'
  return <Circle className="w-2.5 h-2.5" style={{ fill: color, color }} />
}

function Bar({ label, value, color, icon: Icon }) {
  const pct = Math.min(parseFloat(value) || 0, 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-dark-400 flex items-center gap-1">
          <Icon className="w-3 h-3" /> {label}
        </span>
        <span className="text-white tabular-nums">{value}%</span>
      </div>
      <div className="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
        <div className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function Containers() {
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  // modals
  const [logsFor, setLogsFor] = useState(null)
  const [logs, setLogs] = useState('')
  const [logsLoading, setLogsLoading] = useState(false)
  const [chartFor, setChartFor] = useState(null)
  const [history, setHistory] = useState([])

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await axios.get(`${API}/containers`)
      setContainers(res.data.data || [])
    } catch (e) {
      if (manual) toast.error('Falha ao carregar containers')
    }
    setLoading(false)
    if (manual) setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
    const i = setInterval(() => load(), 15000)
    return () => clearInterval(i)
  }, [load])

  const action = async (id, act) => {
    const verb = act === 'start' ? 'Iniciando' : act === 'stop' ? 'Parando' : 'Reiniciando'
    toast.loading(`${verb}...`, { id: 'act' })
    try {
      await axios.post(`${API}/containers/${id}/${act}`)
      toast.success('Feito', { id: 'act' })
      load(true)
    } catch (e) {
      toast.error('Erro na ação', { id: 'act' })
    }
  }

  const openLogs = async (c) => {
    setLogsFor(c); setLogs(''); setLogsLoading(true)
    try {
      const res = await axios.get(`${API}/containers/${c.id}/logs?tail=200`)
      setLogs(res.data.data || '(sem logs)')
    } catch (e) {
      setLogs('Erro ao carregar logs.')
    }
    setLogsLoading(false)
  }

  const openChart = async (c) => {
    setChartFor(c); setHistory([])
    try {
      const res = await axios.get(`${API}/containers/${c.id}/history`)
      setHistory(res.data.data || [])
    } catch (e) {
      setHistory([])
    }
  }

  const filtered = containers.filter(c => {
    const okQuery = c.name.toLowerCase().includes(query.toLowerCase())
      || c.image.toLowerCase().includes(query.toLowerCase())
    const okFilter = filter === 'all' || c.state === filter
    return okQuery && okFilter
  })

  const counts = {
    all: containers.length,
    running: containers.filter(c => c.state === 'running').length,
    exited: containers.filter(c => c.state === 'exited').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Carregando containers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Containers</h1>
          <p className="text-dark-400 text-sm">{counts.running} em execução de {counts.all}</p>
        </div>
        <button onClick={() => load(true)} className="btn-secondary flex items-center gap-2 self-start">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nome ou imagem..."
            className="input pl-9" />
        </div>
        <div className="flex gap-1 bg-dark-900 border border-dark-700 rounded-lg p-1">
          {[['all', 'Todos'], ['running', 'Ativos'], ['exited', 'Parados']].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                filter === k ? 'bg-blue-600 text-white' : 'text-dark-400 hover:text-white'
              }`}>
              {label} <span className="opacity-60">{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Box className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">Nenhum container encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate flex items-center gap-2">
                    <StateDot state={c.state} /> {c.name}
                  </h3>
                  <p className="text-xs text-dark-400 truncate mt-0.5">{c.image}</p>
                </div>
                <span className={`badge ${c.state === 'running' ? 'badge-success' : 'badge-danger'} shrink-0`}>
                  {c.state}
                </span>
              </div>

              <p className="text-xs text-dark-500 mb-3">{c.status}</p>

              {c.stats ? (
                <div className="space-y-2.5 mb-4">
                  <Bar label="CPU" value={c.stats.cpu?.percent || '0'} color={C.green} icon={Cpu} />
                  <Bar label="RAM" value={c.stats.memory?.percent || '0'} color={C.amber} icon={MemoryStick} />
                  {c.stats.memory?.usage && (
                    <p className="text-xs text-dark-500">{c.stats.memory.usage} / {c.stats.memory.limit}</p>
                  )}
                </div>
              ) : (
                <div className="mb-4 text-xs text-dark-600 py-2">sem métricas (container parado)</div>
              )}

              <div className="flex gap-2 mt-auto">
                {c.state === 'running' ? (
                  <>
                    <button onClick={() => action(c.id, 'stop')} title="Parar"
                      className="flex-1 btn-secondary py-2"><Square className="w-4 h-4 mx-auto" /></button>
                    <button onClick={() => action(c.id, 'restart')} title="Reiniciar"
                      className="flex-1 btn-secondary py-2"><RotateCw className="w-4 h-4 mx-auto" /></button>
                  </>
                ) : (
                  <button onClick={() => action(c.id, 'start')} title="Iniciar"
                    className="flex-1 btn-primary py-2"><Play className="w-4 h-4 mx-auto" /></button>
                )}
                <button onClick={() => openChart(c)} title="Gráficos"
                  className="btn-secondary py-2 px-3"><LineChart className="w-4 h-4" /></button>
                <button onClick={() => openLogs(c)} title="Logs"
                  className="btn-secondary py-2 px-3"><Terminal className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart modal */}
      {chartFor && (
        <Modal onClose={() => setChartFor(null)}
          title={<><LineChart className="w-4 h-4 text-blue-500" /> {chartFor.name}</>}>
          {history.length === 0 ? (
            <p className="text-dark-400 text-sm py-10 text-center">
              Ainda coletando dados deste container. Os pontos aparecem a cada 30s.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-dark-400 mb-2 flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU %</p>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="cc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.green} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} minTickGap={28} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="cpu" stroke={C.green} strokeWidth={2} fill="url(#cc)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-2 flex items-center gap-1"><MemoryStick className="w-3 h-3" /> RAM %</p>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="mm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.amber} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} minTickGap={28} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="memory" stroke={C.amber} strokeWidth={2} fill="url(#mm)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Logs modal */}
      {logsFor && (
        <Modal onClose={() => setLogsFor(null)}
          title={<><Terminal className="w-4 h-4 text-green-500" /> Logs · {logsFor.name}</>}>
          {logsLoading ? (
            <p className="text-dark-400 text-sm py-10 text-center">Carregando logs...</p>
          ) : (
            <pre className="bg-dark-950 border border-dark-800 rounded-lg p-3 text-xs text-dark-300 overflow-auto max-h-[55vh] whitespace-pre-wrap break-words">
{logs}
            </pre>
          )}
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-dark-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">{title}</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
