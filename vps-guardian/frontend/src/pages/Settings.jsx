import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, Save, ShieldAlert, Database,
  BellRing, RefreshCw, Mail, Send, Clock, Webhook, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/api'

function Section({ title, icon: Icon, color = 'text-blue-500', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-dark-800 hover:bg-dark-900/50 transition-colors"
      >
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          {title}
        </h2>
        {open ? <ChevronUp className="w-4 h-4 text-dark-500" /> : <ChevronDown className="w-4 h-4 text-dark-500" />}
      </button>
      {open && <div className="p-6 space-y-4">{children}</div>}
    </div>
  )
}

function Toggle({ label, name, checked, onChange, description }) {
  return (
    <div className="flex items-start justify-between gap-4 bg-dark-900 border border-dark-800 p-4 rounded-lg">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-dark-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange({ target: { name, type: 'checkbox', checked: !checked } })}
        className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-dark-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function InputRow({ label, name, type = 'text', value, onChange, placeholder, min, max, note, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-dark-300 mb-1.5">{label}</label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} min={min} max={max} required={required}
        className="input text-sm w-full"
      />
      {note && <p className="text-[10px] text-dark-500 mt-1">{note}</p>}
    </div>
  )
}

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [settings, setSettings] = useState({
    cpuThreshold: 90,
    memoryThreshold: 90,
    diskThreshold: 85,
    webhookEnabled: false,
    webhookUrl: '',
    webhookType: 'slack',
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
    emailEnabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    smtpTo: '',
    maxBackups: 6,
    backupSchedule: '01:00',
    monitoringInterval: 30
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/settings`)
        if (res.data?.success) setSettings(s => ({ ...s, ...res.data.data }))
      } catch (e) {
        toast.error('Erro ao carregar configurações do servidor')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (parseInt(value) || 0) : value
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const tId = toast.loading('Salvando configurações...')
    try {
      const res = await axios.post(`${API}/settings`, settings)
      if (res.data?.success) {
        setSettings(s => ({ ...s, ...res.data.data }))
        toast.success('Configurações salvas com sucesso!', { id: tId })
      } else {
        toast.error('Erro ao salvar as configurações', { id: tId })
      }
    } catch {
      toast.error('Falha na comunicação com o servidor', { id: tId })
    } finally {
      setSaving(false)
    }
  }

  const testTelegram = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      toast.error('Preencha o Token e o Chat ID antes de testar.')
      return
    }
    setTestingTelegram(true)
    const tId = toast.loading('Enviando mensagem de teste via Telegram...')
    try {
      const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`
      await axios.post(url, {
        chat_id: settings.telegramChatId,
        text: '🟢 *INFO: Teste VPS Guardian*\n\nConexão com o Telegram configurada com sucesso!',
        parse_mode: 'Markdown'
      })
      toast.success('Mensagem de teste enviada com sucesso!', { id: tId })
    } catch (e) {
      toast.error(`Falha no Telegram: ${e.response?.data?.description || e.message}`, { id: tId })
    } finally {
      setTestingTelegram(false)
    }
  }

  const testEmail = async () => {
    if (!settings.smtpHost || !settings.smtpTo) {
      toast.error('Preencha o servidor SMTP e o e-mail destinatário antes de testar.')
      return
    }
    setTestingEmail(true)
    const tId = toast.loading('Enviando e-mail de teste...')
    try {
      await axios.post(`${API}/settings/test-email`)
      toast.success('E-mail de teste enviado com sucesso!', { id: tId })
    } catch (e) {
      toast.error(`Falha ao enviar e-mail: ${e.response?.data?.error || e.message}`, { id: tId })
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-8 h-8 text-blue-500" /> Configurações
        </h1>
        <p className="text-dark-400 text-sm mt-1">Gerencie limites de recursos, agendamentos, backups e canais de alerta</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">

        {/* Limites de Recursos */}
        <Section title="Limites de Alerta (Thresholds)" icon={ShieldAlert} color="text-amber-500">
          <p className="text-xs text-dark-500">
            Configure os limites em percentual. Quando o uso ultrapassar os valores abaixo, alertas serão disparados em todos os canais ativos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputRow label="CPU Máxima (%)" name="cpuThreshold" type="number" value={settings.cpuThreshold} onChange={handleChange} min={10} max={100} required />
            <InputRow label="RAM Máxima (%)" name="memoryThreshold" type="number" value={settings.memoryThreshold} onChange={handleChange} min={10} max={100} required />
            <InputRow label="Disco Máximo (%)" name="diskThreshold" type="number" value={settings.diskThreshold} onChange={handleChange} min={10} max={100} required />
          </div>
        </Section>

        {/* Backups */}
        <Section title="Backups e Monitoramento" icon={Database} color="text-blue-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Horário do Backup Automático
              </label>
              <input
                type="time"
                name="backupSchedule"
                value={settings.backupSchedule}
                onChange={handleChange}
                className="input text-sm w-full"
              />
              <p className="text-[10px] text-dark-500 mt-1">O cron será reagendado automaticamente ao salvar.</p>
            </div>
            <InputRow
              label="Retenção Máxima de Backups"
              name="maxBackups" type="number"
              value={settings.maxBackups} onChange={handleChange}
              min={1} max={50}
              note="Backups excedentes são removidos automaticamente."
              required
            />
            <InputRow
              label="Intervalo de Monitoramento (seg)"
              name="monitoringInterval" type="number"
              value={settings.monitoringInterval} onChange={handleChange}
              min={5} max={300}
              note="Frequência de coleta de métricas e checagem de limites."
              required
            />
          </div>
        </Section>

        {/* Webhook Slack/Discord */}
        <Section title="Webhook (Slack / Discord)" icon={Webhook} color="text-purple-500" defaultOpen={false}>
          <Toggle
            label="Habilitar Notificações via Webhook"
            name="webhookEnabled"
            checked={settings.webhookEnabled}
            onChange={handleChange}
            description="Envie alertas para canais Slack, Discord ou endpoints HTTP personalizados."
          />
          {settings.webhookEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">Tipo</label>
                <select
                  name="webhookType"
                  value={settings.webhookType}
                  onChange={handleChange}
                  className="input text-sm h-[42px]"
                >
                  <option value="slack">Slack</option>
                  <option value="discord">Discord</option>
                  <option value="general">JSON Genérico</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <InputRow
                  label="URL do Webhook"
                  name="webhookUrl"
                  type="url"
                  value={settings.webhookUrl}
                  onChange={handleChange}
                  placeholder="https://hooks.slack.com/services/..."
                  required={settings.webhookEnabled}
                />
              </div>
            </div>
          )}
        </Section>

        {/* Telegram */}
        <Section title="Telegram" icon={Send} color="text-sky-500" defaultOpen={false}>
          <Toggle
            label="Habilitar Alertas via Telegram"
            name="telegramEnabled"
            checked={settings.telegramEnabled}
            onChange={handleChange}
            description="Receba alertas em tempo real no Telegram usando um bot configurado."
          />
          {settings.telegramEnabled && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputRow
                  label="Token do Bot"
                  name="telegramBotToken"
                  value={settings.telegramBotToken}
                  onChange={handleChange}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  note="Obtenha o token criando um bot com o @BotFather no Telegram."
                  required={settings.telegramEnabled}
                />
                <InputRow
                  label="Chat ID (Grupo ou Canal)"
                  name="telegramChatId"
                  value={settings.telegramChatId}
                  onChange={handleChange}
                  placeholder="-1001234567890"
                  note="Use o @userinfobot para descobrir o ID do seu chat."
                  required={settings.telegramEnabled}
                />
              </div>
              <button
                type="button"
                onClick={testTelegram}
                disabled={testingTelegram}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {testingTelegram ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Mensagem de Teste
              </button>
            </div>
          )}
        </Section>

        {/* E-mail SMTP */}
        <Section title="E-mail (SMTP)" icon={Mail} color="text-green-500" defaultOpen={false}>
          <Toggle
            label="Habilitar Alertas via E-mail"
            name="emailEnabled"
            checked={settings.emailEnabled}
            onChange={handleChange}
            description="Envie e-mails HTML de alerta para o endereço configurado via servidor SMTP."
          />
          {settings.emailEnabled && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <InputRow
                    label="Servidor SMTP (Host)"
                    name="smtpHost"
                    value={settings.smtpHost}
                    onChange={handleChange}
                    placeholder="smtp.gmail.com"
                    required={settings.emailEnabled}
                  />
                </div>
                <InputRow
                  label="Porta SMTP"
                  name="smtpPort"
                  type="number"
                  value={settings.smtpPort}
                  onChange={handleChange}
                  placeholder="587"
                  note="587 (TLS) ou 465 (SSL)"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputRow
                  label="Usuário SMTP"
                  name="smtpUser"
                  value={settings.smtpUser}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                />
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1.5">Senha SMTP</label>
                  <input
                    type="password"
                    name="smtpPass"
                    value={settings.smtpPass}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    className="input text-sm w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputRow
                  label="Remetente (From)"
                  name="smtpFrom"
                  value={settings.smtpFrom}
                  onChange={handleChange}
                  placeholder='"VPS Guardian" <alertas@meudominio.com>'
                />
                <InputRow
                  label="Destinatário (To)"
                  name="smtpTo"
                  value={settings.smtpTo}
                  onChange={handleChange}
                  placeholder="admin@meudominio.com"
                  required={settings.emailEnabled}
                />
              </div>
              <button
                type="button"
                onClick={testEmail}
                disabled={testingEmail}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {testingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Enviar E-mail de Teste
              </button>
            </div>
          )}
        </Section>

        {/* Salvar */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-6 py-2.5"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  )
}
