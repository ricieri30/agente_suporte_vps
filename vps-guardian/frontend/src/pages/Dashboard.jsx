import { useState, useEffect } from 'react'
import {
  Container, Cpu, MemoryStick, HardDrive, Clock,
  CheckCircle2, AlertTriangle, Database, Server, Activity
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/api'

const C = { blue: '#3b82f6', green: '#22c55e', amber: '#f59e0b', red: '#ef4444' }

function fmtUptime(sec) {
  if (!sec) return '—'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StatCard({ icon: Icon, label, value, sub, percent, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color}1a` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
      </div>
      <div className="text-dark-400 text-sm font-medium">{label}</div>
      {sub && <div className="text-dark-500 text-xs mt-1">{sub}</div>}
      {percent != null && (
        <div className="mt-3 w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
          <div className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }} />
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)

  const fetchAll = async () => {
    try {
      const [dash, hist] = await Promise.all([
        axios.get(`${API}/dashboard`),
        axios.get(`${API}/metrics/history`)
      ])
      setData(dash.data.data)
      setHistory(hist.data.data || [])
      setErr(false)
    } catch (e) {
      setErr(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    const dataInt = setInterval(fetchAll, 15000)
    const clockInt = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(dataInt); clearInterval(clockInt) }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Carregando métricas do VPS...</p>
        </div>
      </div>
    )
  }

  const sys = data?.system
  const cont = data?.containers || { total: 0, running: 0, stopped: 0 }

  const pieData = [
    { name: 'Em execução', value: cont.running, color: C.green },
    { name: 'Parados', value: cont.stopped, color: C.red }
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-400 text-sm">
            {sys ? `${sys.os} · uptime ${fmtUptime(sys.uptime)}` : 'Monitoramento do servidor'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-dark-400 text-sm">
          <Clock className="w-4 h-4" />
          <span className="tabular-nums">{now.toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>

      {err && (
        <div className="card p-4 border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-amber-200 text-sm">
            Não consegui ler as métricas do backend. Verifique se a API responde em <code className="text-amber-300">{API}</code>.
          </p>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Container} label="Containers" color={C.blue}
          value={cont.total} sub={`${cont.running} ativos · ${cont.stopped} parados`} />
        <StatCard icon={Cpu} label="CPU" color={C.green}
          value={sys ? `${sys.cpu.usage}%` : '—'} sub={sys ? `${sys.cpu.cores} cores` : ''} percent={sys?.cpu.usage} />
        <StatCard icon={MemoryStick} label="Memória" color={C.amber}
          value={sys ? `${sys.memory.percent}%` : '—'} sub={sys ? `${sys.memory.usedFormatted} / ${sys.memory.totalFormatted}` : ''} percent={sys?.memory.percent} />
        <StatCard icon={HardDrive} label="Disco" color={C.red}
          value={sys ? `${sys.disk.percent}%` : '—'} sub={sys ? `${sys.disk.usedFormatted} / ${sys.disk.totalFormatted}` : ''} percent={sys?.disk.percent} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-green-500" /> Uso de CPU
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} minTickGap={30} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="cpu" stroke={C.green} strokeWidth={2} fill="url(#gCpu)" name="CPU %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <MemoryStick className="w-4 h-4 text-amber-500" /> Uso de Memória
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} minTickGap={30} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="memory" stroke={C.amber} strokeWidth={2.5} dot={false} name="RAM %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Container status */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" /> Status dos Containers
          </h2>
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-dark-500 text-sm py-8 text-center">Sem dados</p>}
          <div className="space-y-1.5 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-dark-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.name}
                </span>
                <span className="text-white font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Backups */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-green-500" /> Backups
          </h2>
          <div className="text-3xl font-bold text-white">{data?.backups.total || 0}</div>
          <p className="text-dark-400 text-xs mt-1">backups armazenados</p>
          <div className="mt-4 pt-4 border-t border-dark-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-dark-400">Último</span>
              <span className="text-white">
                {data?.backups.latest ? new Date(data.backups.latest.created).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'nenhum'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Próximo</span>
              <span className="text-white">amanhã 01:00</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" /> Alertas
          </h2>
          {(data?.alerts.active || 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
              <p className="text-white text-sm font-medium">Tudo certo</p>
              <p className="text-dark-500 text-xs">Nenhum alerta ativo</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-3xl font-bold text-red-500">{data.alerts.critical}</div>
              <p className="text-dark-400 text-xs mt-1">alertas críticos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
