import { useState, useEffect, useCallback } from 'react'
import {
  Database, Plus, RefreshCw, Trash2, RotateCcw, Calendar,
  FileArchive, HardDrive, Logs, Settings2, Box, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/api'

const BACKUP_TYPES = [
  {
    key: 'full',
    label: 'Backup Completo',
    description: 'Logs da aplicação + arquivo de configurações (config.json)',
    icon: HardDrive,
    color: 'text-blue-500',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  },
  {
    key: 'logs',
    label: 'Somente Logs',
    description: 'Apenas os logs gerados pela aplicação (/app/logs)',
    icon: Logs,
    color: 'text-green-500',
    badge: 'bg-green-500/10 text-green-400 border-green-500/20'
  },
  {
    key: 'config',
    label: 'Somente Config',
    description: 'Apenas o arquivo config.json com todas as configurações',
    icon: Settings2,
    color: 'text-amber-500',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  {
    key: 'container',
    label: 'Container Individual',
    description: 'Logs de um container Docker específico selecionado',
    icon: Box,
    color: 'text-purple-500',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  }
]

export default function Backups() {
  const [backups, setBackups] = useState([])
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedType, setSelectedType] = useState('full')
  const [selectedContainer, setSelectedContainer] = useState('')
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  const loadBackups = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true)
    try {
      const res = await axios.get(`${API}/backups`)
      if (res.data?.success) {
        setBackups(res.data.data || [])
        if (showToast) toast.success('Lista atualizada')
      }
    } catch {
      toast.error('Falha ao carregar backups')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const loadContainers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/containers`)
      if (res.data?.success) setContainers(res.data.data || [])
    } catch {}
  }, [])

  useEffect(() => {
    loadBackups()
    loadContainers()
  }, [loadBackups, loadContainers])

  const selectedTypeInfo = BACKUP_TYPES.find(t => t.key === selectedType)

  const handleCreate = async () => {
    if (selectedType === 'container' && !selectedContainer) {
      toast.error('Selecione um container antes de criar o backup.')
      return
    }
    setCreating(true)
    const typeLabel = selectedTypeInfo?.label || selectedType
    const tId = toast.loading(`Criando backup: ${typeLabel}...`)
    try {
      const body = { type: selectedType }
      if (selectedType === 'container') body.containerId = selectedContainer
      const res = await axios.post(`${API}/backups`, body)
      if (res.data?.success) {
        toast.success(`Backup "${typeLabel}" concluído!`, { id: tId })
        loadBackups()
        setShowTypeSelector(false)
      } else {
        toast.error('Erro ao gerar o backup', { id: tId })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro de rede ao criar backup', { id: tId })
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (id) => {
    if (!confirm('Deseja realmente restaurar este backup? Os dados serão sobrepostos.')) return
    const tId = toast.loading('Restaurando...')
    try {
      const res = await axios.post(`${API}/backups/${id}/restore`)
      if (res.data?.success) {
        toast.success('Restauração iniciada com sucesso!', { id: tId })
      } else {
        toast.error('Falha na restauração', { id: tId })
      }
    } catch { toast.error('Erro de rede ao restaurar', { id: tId }) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir permanentemente este backup? Não pode ser desfeito.')) return
    const tId = toast.loading('Removendo...')
    try {
      const res = await axios.delete(`${API}/backups/${id}`)
      if (res.data?.success) {
        toast.success('Backup removido!', { id: tId })
        setBackups(prev => prev.filter(b => b.id !== id))
      } else {
        toast.error('Falha ao remover', { id: tId })
      }
    } catch { toast.error('Erro de rede ao excluir', { id: tId }) }
  }

  function getTypeBadge(name) {
    if (name?.includes('-container-')) return BACKUP_TYPES[3]
    if (name?.includes('-config-')) return BACKUP_TYPES[2]
    if (name?.includes('-logs-')) return BACKUP_TYPES[1]
    return BACKUP_TYPES[0]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Carregando gerenciador de backups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Database className="w-8 h-8 text-green-500" /> Backups
          </h1>
          <p className="text-dark-400 text-sm mt-1">Crie, restaure e gerencie pontos de recuperação do servidor</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadBackups(true)} disabled={refreshing} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
          </button>
          <button
            onClick={() => setShowTypeSelector(s => !s)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Criar Backup <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>

      {/* Seletor de tipo de backup */}
      {showTypeSelector && (
        <div className="card p-5 space-y-4 border border-blue-500/20 bg-blue-500/5">
          <h2 className="text-sm font-semibold text-white">Escolha o tipo de backup:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {BACKUP_TYPES.map(t => {
              const Icon = t.icon
              const selected = selectedType === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setSelectedType(t.key); setSelectedContainer('') }}
                  className={`flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-dark-700 bg-dark-900 hover:border-dark-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${t.color}`} />
                  <span className="text-sm font-semibold text-white">{t.label}</span>
                  <span className="text-[11px] text-dark-400 leading-relaxed">{t.description}</span>
                </button>
              )
            })}
          </div>

          {/* Dropdown de container */}
          {selectedType === 'container' && (
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Selecione o Container</label>
              <select
                value={selectedContainer}
                onChange={e => setSelectedContainer(e.target.value)}
                className="input text-sm"
              >
                <option value="">-- escolha um container --</option>
                {containers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={creating || (selectedType === 'container' && !selectedContainer)}
              className="btn-primary flex items-center gap-2"
            >
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating ? 'Criando...' : `Criar: ${selectedTypeInfo?.label}`}
            </button>
            <button type="button" onClick={() => setShowTypeSelector(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-sm font-semibold text-dark-400 mb-1">Total de Backups</div>
          <div className="text-3xl font-bold text-white tabular-nums">{backups.length}</div>
          <p className="text-xs text-dark-500 mt-2">Armazenados no volume local da VPS</p>
        </div>
        <div className="card p-6">
          <div className="text-sm font-semibold text-dark-400 mb-1">Último Backup</div>
          <div className="text-lg font-bold text-white truncate">{backups[0]?.name || '—'}</div>
          <p className="text-xs text-dark-500 mt-2">
            {backups[0] ? new Date(backups[0].created).toLocaleString('pt-BR') : 'Sem backups criados'}
          </p>
        </div>
        <div className="card p-6">
          <div className="text-sm font-semibold text-dark-400 mb-1">Rotina Automática</div>
          <div className="text-3xl font-bold text-green-500">Ativa</div>
          <p className="text-xs text-dark-500 mt-2">Configure o horário em <span className="text-white">Configurações</span></p>
        </div>
      </div>

      {/* Tabela de Backups */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileArchive className="w-5 h-5 text-blue-500" /> Histórico de Pontos de Restauração
        </h2>
        {backups.length === 0 ? (
          <div className="py-12 text-center text-dark-500">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum backup disponível na VPS</p>
            <p className="text-xs mt-1">Clique em "Criar Backup" para gerar o primeiro ponto de restauração.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-dark-300">
              <thead className="text-xs uppercase text-dark-500 border-b border-dark-800">
                <tr>
                  <th className="py-3 px-4">Arquivo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Tamanho</th>
                  <th className="py-3 px-4">Criado Em</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-900">
                {backups.map(b => {
                  const typeInfo = getTypeBadge(b.name)
                  const TypeIcon = typeInfo.icon
                  return (
                    <tr key={b.id} className="hover:bg-dark-900/40 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <FileArchive className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-white font-medium text-xs truncate max-w-[180px]">{b.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${typeInfo.badge}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 tabular-nums text-xs">{b.sizeFormatted}</td>
                      <td className="py-4 px-4 text-xs">
                        <div className="flex items-center gap-1.5 text-dark-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(b.created).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRestore(b.id)}
                            title="Restaurar"
                            className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-xs hover:bg-green-600/10 hover:text-green-500 hover:border-green-600/30"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            title="Excluir"
                            className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-xs text-red-400 hover:bg-red-600/10 hover:border-red-600/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
