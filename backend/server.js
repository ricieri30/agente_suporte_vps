require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const Docker = require('dockerode');
const cron = require('node-cron');
const winston = require('winston');
const si = require('systeminformation');
const fs = require('fs');
const path = require('path');

// ==================== Logger ====================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// ==================== App ====================
const app = express();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const PORT = process.env.PORT || 3000;

const { exec } = require('child_process');
const axios = require('axios');

app.use(cors());
app.use(compression());
app.use(express.json());

// ==================== Configurações Dinâmicas ====================
const CONFIG_PATH = path.join(__dirname, 'config.json');
let globalSettings = {
  backupDir: process.env.BACKUP_DIR || '/var/backups/vps-guardian',
  maxBackups: parseInt(process.env.MAX_BACKUPS) || 6,
  backupSchedule: process.env.BACKUP_SCHEDULE || '01:00', // Formato HH:MM
  webhookEnabled: process.env.WEBHOOK_ENABLED === 'true',
  webhookUrl: process.env.WEBHOOK_URL || '',
  webhookType: process.env.WEBHOOK_TYPE || 'slack',
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
  cpuThreshold: parseInt(process.env.CPU_THRESHOLD) || 90,
  memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD) || 90,
  diskThreshold: parseInt(process.env.DISK_THRESHOLD) || 85,
  monitoringInterval: parseInt(process.env.MONITORING_INTERVAL) || 30
};

function loadSettings() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const fileContent = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(fileContent);
      globalSettings = { ...globalSettings, ...parsed };
      logger.info('✅ Configurações carregadas do config.json');
    } catch (e) {
      logger.error('Erro ao ler config.json: ' + e.message);
    }
  }
}

function saveSettings(settings) {
  globalSettings = { ...globalSettings, ...settings };
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
    logger.info('✅ Configurações salvas em config.json');
    // Reconfigura o agendamento cron sempre que as configurações forem salvas
    scheduleBackupCron();
    return true;
  } catch (e) {
    logger.error('Erro ao salvar config.json: ' + e.message);
    return false;
  }
}

let backupCronJob = null;

function scheduleBackupCron() {
  if (backupCronJob) {
    backupCronJob.stop();
    logger.info('🛑 Cron de backup anterior interrompido.');
  }

  const scheduleStr = globalSettings.backupSchedule || '01:00'; // Formato HH:MM
  const [hour, minute] = scheduleStr.split(':').map(Number);
  const cronPattern = `${minute || 0} ${hour || 0} * * *`;

  logger.info(`⏰ Cron de backup automático agendado para: ${cronPattern} (${scheduleStr})`);

  backupCronJob = cron.schedule(cronPattern, async () => {
    logger.info('⏰ Backup automático agendado iniciado');
    try {
      await runBackup('full');
      broadcastAlert('info', 'Backup Diário Realizado', 'O backup automático completo foi concluído com sucesso.');
    } catch (e) {
      logger.error('Erro no backup automático: ' + e.message);
      broadcastAlert('critical', 'Falha no Backup Diário', `Falha ao realizar o backup automático. Erro: ${e.message}`);
    }
  });
}

loadSettings();
scheduleBackupCron();

// ==================== Registro de Alertas & Notificações Multi-Canal ====================
const activeAlerts = new Map();
let criticalAlertsCount = 0;

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Webhook slack/discord
async function sendWebhook(level, title, message) {
  if (!globalSettings.webhookEnabled || !globalSettings.webhookUrl) return;
  try {
    let payload = {};
    if (globalSettings.webhookType === 'slack') {
      payload = {
        text: `*${level.toUpperCase()}: ${title}*\n${message}\n_Host: VPS Guardian_`
      };
    } else if (globalSettings.webhookType === 'discord') {
      const color = level === 'critical' ? 16711680 : level === 'warning' ? 16753920 : 65280;
      payload = {
        embeds: [{
          title: `${level.toUpperCase()}: ${title}`,
          description: message,
          color: color,
          footer: { text: 'VPS Guardian' },
          timestamp: new Date().toISOString()
        }]
      };
    } else {
      payload = { level, title, message, host: 'vps-guardian', timestamp: new Date().toISOString() };
    }
    await axios.post(globalSettings.webhookUrl, payload);
    logger.info(`🔔 Webhook enviado com sucesso (${globalSettings.webhookType})`);
  } catch (e) {
    logger.error(`❌ Falha ao enviar webhook: ${e.message}`);
  }
}

// Telegram
async function sendTelegramAlert(level, title, message) {
  if (!globalSettings.telegramEnabled || !globalSettings.telegramBotToken || !globalSettings.telegramChatId) return;
  try {
    const emoji = level === 'critical' ? '🔴' : level === 'warning' ? '🟡' : '🟢';
    // Telegram HTML parsing é muito mais estável que Markdown (não quebra com underscores nos nomes dos containers)
    const text = `${emoji} <b>${escapeHtml(level.toUpperCase())}: ${escapeHtml(title)}</b>\n\n${escapeHtml(message)}\n\n<i>Host: VPS Guardian</i>`;
    const url = `https://api.telegram.org/bot${globalSettings.telegramBotToken}/sendMessage`;
    await axios.post(url, {
      chat_id: globalSettings.telegramChatId,
      text: text,
      parse_mode: 'HTML'
    });
    logger.info('🔔 Alerta enviado via Telegram');
  } catch (e) {
    logger.error('❌ Falha ao enviar telegram: ' + e.message);
  }
}

// SMTP E-mail
async function sendEmailAlert(level, title, message) {
  if (!globalSettings.emailEnabled || !globalSettings.smtpHost || !globalSettings.smtpTo) return;
  try {
    const nodemailer = require('nodemailer');
    const mailConfig = {
      host: globalSettings.smtpHost,
      port: parseInt(globalSettings.smtpPort) || 587,
      secure: parseInt(globalSettings.smtpPort) === 465,
    };
    if (globalSettings.smtpUser) {
      mailConfig.auth = {
        user: globalSettings.smtpUser,
        pass: globalSettings.smtpPass || ''
      };
    }
    const transporter = nodemailer.createTransport(mailConfig);

    const subject = `[Guardian] ${level.toUpperCase()}: ${title}`;
    const color = level === 'critical' ? '#ef4444' : level === 'warning' ? '#f59e0b' : '#22c55e';
    const html = `
      <div style="font-family: sans-serif; padding: 25px; background-color: #0f172a; color: #f8fafc; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: ${color}; margin-top: 0; border-bottom: 1px solid #1e293b; padding-bottom: 15px;">${escapeHtml(title)}</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1; white-space: pre-wrap;">${escapeHtml(message)}</p>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 25px 0;" />
        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Notificação gerada automaticamente pelo VPS Guardian.<br/>Host: VPS Guardian</p>
      </div>
    `;

    await transporter.sendMail({
      from: globalSettings.smtpFrom || '"VPS Guardian" <no-reply@vps-guardian.com>',
      to: globalSettings.smtpTo,
      subject: subject,
      html: html
    });
    logger.info('🔔 Alerta enviado via E-mail');
  } catch (e) {
    logger.error('❌ Falha ao enviar e-mail SMTP: ' + e.message);
  }
}

// Broadcast Geral
async function broadcastAlert(level, title, message) {
  await Promise.all([
    sendWebhook(level, title, message),
    sendTelegramAlert(level, title, message),
    sendEmailAlert(level, title, message)
  ]);
}

function checkThresholds(metrics) {
  // CPU check
  if (metrics.cpu.usage > globalSettings.cpuThreshold) {
    if (!activeAlerts.has('cpu')) {
      const title = 'Alto Uso de CPU';
      const msg = `O uso de CPU no VPS atingiu ${metrics.cpu.usage}% (Limite configurado: ${globalSettings.cpuThreshold}%).`;
      activeAlerts.set('cpu', { level: 'critical', title, message: msg, time: Date.now() });
      criticalAlertsCount++;
      broadcastAlert('critical', title, msg);
    }
  } else {
    if (activeAlerts.has('cpu')) {
      activeAlerts.delete('cpu');
      if (criticalAlertsCount > 0) criticalAlertsCount--;
      broadcastAlert('info', 'CPU Normalizada', `O uso de CPU reduziu para ${metrics.cpu.usage}%.`);
    }
  }

  // RAM check
  if (metrics.memory.percent > globalSettings.memoryThreshold) {
    if (!activeAlerts.has('memory')) {
      const title = 'Alto Uso de RAM';
      const msg = `O uso de RAM no VPS atingiu ${metrics.memory.percent}% (Limite configurado: ${globalSettings.memoryThreshold}%).`;
      activeAlerts.set('memory', { level: 'critical', title, message: msg, time: Date.now() });
      criticalAlertsCount++;
      broadcastAlert('critical', title, msg);
    }
  } else {
    if (activeAlerts.has('memory')) {
      activeAlerts.delete('memory');
      if (criticalAlertsCount > 0) criticalAlertsCount--;
      broadcastAlert('info', 'RAM Normalizada', `O uso de RAM reduziu para ${metrics.memory.percent}%.`);
    }
  }

  // Disk check
  if (metrics.disk.percent > globalSettings.diskThreshold) {
    if (!activeAlerts.has('disk')) {
      const title = 'Pouco Espaço em Disco';
      const msg = `O uso de disco no VPS atingiu ${metrics.disk.percent}% (Limite configurado: ${globalSettings.diskThreshold}%).`;
      activeAlerts.set('disk', { level: 'critical', title, message: msg, time: Date.now() });
      criticalAlertsCount++;
      broadcastAlert('critical', title, msg);
    }
  } else {
    if (activeAlerts.has('disk')) {
      activeAlerts.delete('disk');
      if (criticalAlertsCount > 0) criticalAlertsCount--;
      broadcastAlert('info', 'Espaço em Disco Normalizado', `O uso de disco estabilizou em ${metrics.disk.percent}%.`);
    }
  }
}

// ==================== Auto-Restart de Containers ====================
const lastContainerStates = new Map();
const restartTracker = new Map();

async function checkContainersAutoRestart() {
  try {
    const containers = await docker.listContainers({ all: true });
    const now = Date.now();
    for (const c of containers) {
      const id = c.Id.substring(0, 12);
      const name = c.Names[0]?.replace('/', '') || 'unknown';
      const currentState = c.State;
      const prevState = lastContainerStates.get(id);

      // Se o container voltou a rodar normalmente por mais de 10 minutos, limpa o rastreador de restarts
      const tracking = restartTracker.get(id);
      if (currentState === 'running' && tracking && now - tracking.lastAttempt > 600000) {
        restartTracker.delete(id);
      }

      if (prevState === 'running' && currentState === 'exited') {
        logger.warn(`⚠️ Container caído detectado: ${name} (${id}).`);
        
        let track = restartTracker.get(id) || { count: 0, lastAttempt: 0 };
        
        // Cooldown de 5 minutos entre tentativas de auto-restart
        if (now - track.lastAttempt < 300000) {
          logger.info(`⏳ Cooldown de auto-restart ativo para o container ${name}. Ignorando tentativa.`);
          lastContainerStates.set(id, currentState);
          continue;
        }

        // Limite de 3 tentativas
        if (track.count >= 3) {
          logger.error(`❌ Container ${name} atingiu o limite máximo de 3 tentativas de reinício automático.`);
          if (track.count === 3) {
            broadcastAlert('critical', 'Falha Permanente no Container', `O container ${name} falhou permanentemente após atingir o limite de 3 tentativas de auto-restart.`);
            track.count = 4; // Incrementa para não reenviar este alerta crítico em loop
            restartTracker.set(id, track);
          }
          lastContainerStates.set(id, currentState);
          continue;
        }

        track.count++;
        track.lastAttempt = now;
        restartTracker.set(id, track);

        logger.warn(`⚠️ Tentando reiniciar automaticamente o container ${name} (Tentativa ${track.count}/3)...`);
        broadcastAlert('warning', 'Container Caído', `O container ${name} caiu. Tentando reinício automático (Tentativa ${track.count}/3)...`);
        
        try {
          const container = docker.getContainer(c.Id);
          await container.start();
          logger.info(`✅ Container ${name} reiniciado com sucesso via auto-restart (Tentativa ${track.count}/3).`);
          broadcastAlert('info', 'Container Recuperado', `O container ${name} foi reiniciado com sucesso na tentativa ${track.count}/3.`);
        } catch (err) {
          logger.error(`❌ Falha ao reiniciar container ${name} (Tentativa ${track.count}/3): ${err.message}`);
          if (track.count === 3) {
            broadcastAlert('critical', 'Falha Permanente no Container', `O container ${name} falhou permanentemente. Não foi possível reiniciar após 3 tentativas. Último erro: ${err.message}`);
            track.count = 4;
            restartTracker.set(id, track);
          } else {
            broadcastAlert('critical', 'Falha no Auto-Restart', `Não foi possível reiniciar o container ${name} na tentativa ${track.count}/3. Erro: ${err.message}`);
          }
        }
      }
      lastContainerStates.set(id, currentState);
    }
  } catch (e) {
    logger.error('Erro na verificação de auto-restart: ' + e.message);
  }
}

// ==================== Histórico de métricas (em memória) ====================
// Guardamos amostras para alimentar os gráficos do dashboard.
const MAX_SAMPLES = 240; // ~2h a cada 30s, ou ajustável
const metricsHistory = [];

// Histórico de CPU/RAM por container (id -> {name, samples:[{t,cpu,memory}]})
const MAX_CONTAINER_SAMPLES = 60; // ~30min a cada 30s
const containerHistory = {};

function pushContainerSample(id, name, cpu, memory) {
  if (!containerHistory[id]) containerHistory[id] = { name, samples: [] };
  containerHistory[id].name = name;
  const arr = containerHistory[id].samples;
  arr.push({ t: Date.now(), cpu, memory });
  if (arr.length > MAX_CONTAINER_SAMPLES) arr.shift();
}

function pushSample(sample) {
  metricsHistory.push(sample);
  if (metricsHistory.length > MAX_SAMPLES) metricsHistory.shift();
}

// Coleta métricas reais do sistema (host quando o container expõe /proc do host)
async function collectSystemMetrics() {
  const [cpu, mem, fsSize, osInfo, load, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.osInfo(),
    si.currentLoad(),
    si.time()
  ]);

  // Disco: prefere o mount do host (/rootfs montado via docker-compose).
  // Ignora pseudo-filesystems (overlay, tmpfs, mounts virtuais) para
  // refletir o disco real do VPS.
  const ignore = ['/mnt/', '/proc', '/sys', '/dev', '/run'];
  const disks = (fsSize || []).filter(d =>
    d.size > 0 && !ignore.some(p => (d.mount || '').startsWith(p))
  );
  const hostDisk = disks.find(d => d.mount === '/rootfs' || d.mount === '/host');
  const mainDisk = hostDisk
    || disks.filter(d => d.mount === '/')[0]
    || disks.sort((a, b) => b.size - a.size)[0]
    || { size: 0, used: 0, use: 0, mount: '/' };

  return {
    timestamp: Date.now(),
    cpu: {
      usage: +(cpu.currentLoad || 0).toFixed(1),
      cores: cpu.cpus ? cpu.cpus.length : 0
    },
    memory: {
      percent: +((mem.active / mem.total) * 100 || 0).toFixed(1),
      used: mem.active,
      total: mem.total,
      usedFormatted: formatBytes(mem.active),
      totalFormatted: formatBytes(mem.total)
    },
    disk: {
      percent: +(mainDisk.use || 0).toFixed(1),
      used: mainDisk.used,
      total: mainDisk.size,
      usedFormatted: formatBytes(mainDisk.used),
      totalFormatted: formatBytes(mainDisk.size),
      mount: mainDisk.mount
    },
    uptime: time.uptime,
    os: `${osInfo.distro} ${osInfo.release}`
  };
}

// ==================== Health ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// ==================== Métricas do sistema (VPS) ====================
app.get('/api/metrics/system', async (req, res) => {
  try {
    const metrics = await collectSystemMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Erro métricas sistema: ' + error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Histórico para os gráficos
app.get('/api/metrics/history', (req, res) => {
  res.json({
    success: true,
    data: metricsHistory.map(s => ({
      time: new Date(s.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      cpu: s.cpu.usage,
      memory: s.memory.percent,
      disk: s.disk.percent
    }))
  });
});

// Histórico de um container específico (para gráficos por container)
app.get('/api/containers/:id/history', (req, res) => {
  const entry = containerHistory[req.params.id];
  const data = entry ? entry.samples.map(s => ({
    time: new Date(s.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    cpu: s.cpu,
    memory: s.memory
  })) : [];
  res.json({ success: true, data });
});


// ==================== Containers ====================
app.get('/api/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const detailed = await Promise.all(
      containers.map(async (c) => {
        const container = docker.getContainer(c.Id);
        let stats = null;
        try {
          if (c.State === 'running') stats = await container.stats({ stream: false });
        } catch (e) {}
        return {
          id: c.Id.substring(0, 12),
          name: c.Names[0]?.replace('/', '') || 'unknown',
          image: c.Image,
          state: c.State,
          status: c.Status,
          stats: stats ? parseStats(stats) : null
        };
      })
    );
    res.json({ success: true, data: detailed });
  } catch (error) {
    logger.error('Erro containers: ' + error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/containers/:id/:action', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    switch (req.params.action) {
      case 'start': await container.start(); break;
      case 'stop': await container.stop({ t: 10 }); break;
      case 'restart': await container.restart({ t: 10 }); break;
      default: return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    logger.info(`Container ${req.params.action}: ${req.params.id}`);
    res.json({ success: true, message: `Container ${req.params.action}ed` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/containers/:id/logs', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const logs = await container.logs({
      stdout: true, stderr: true,
      tail: parseInt(req.query.tail) || 100, timestamps: true
    });
    res.json({ success: true, data: logs.toString('utf8') });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Settings ====================
app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: globalSettings });
});

app.post('/api/settings', (req, res) => {
  const success = saveSettings(req.body);
  if (success) {
    res.json({ success: true, message: 'Configurações salvas com sucesso', data: globalSettings });
  } else {
    res.status(500).json({ success: false, error: 'Falha ao salvar configurações' });
  }
});

// Rota de teste de e-mail
app.post('/api/settings/test-email', async (req, res) => {
  try {
    await sendEmailAlert('info', 'Teste de Configuração', 'Esta é uma mensagem de teste enviada pelo VPS Guardian para validar as configurações de e-mail SMTP.');
    res.json({ success: true, message: 'E-mail de teste enviado com sucesso' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== Backups ====================
function runBackup(type = 'full', containerId = null) {
  return new Promise(async (resolve, reject) => {
    // Sanitização de entradas contra command injection
    const validTypes = ['full', 'logs', 'config', 'container'];
    if (!validTypes.includes(type)) {
      return reject(new Error('Tipo de backup inválido.'));
    }
    if (containerId && !/^[a-zA-Z0-9_-]+$/.test(containerId)) {
      return reject(new Error('ID de container inválido para backup.'));
    }

    const backupDir = globalSettings.backupDir;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let filename = `backup-${type}-${timestamp}.tar.gz`;
    
    if (type === 'container' && containerId) {
      try {
        const container = docker.getContainer(containerId);
        const details = await container.inspect();
        const name = details.Name?.replace('/', '') || containerId;
        filename = `backup-container-${name}-${timestamp}.tar.gz`;
        const filepath = path.join(backupDir, filename);

        // Captura os logs do container do dockerode
        const logsBuf = await container.logs({ stdout: true, stderr: true, tail: 1000, timestamps: true });
        const tempLogPath = path.join('/app/logs', `container-${name}.log`);
        if (!fs.existsSync('/app/logs')) fs.mkdirSync('/app/logs', { recursive: true });
        fs.writeFileSync(tempLogPath, logsBuf.toString('utf8'), 'utf8');

        exec(`tar -czf "${filepath}" -C /app/logs "container-${name}.log"`, (err) => {
          // Limpa log temporário
          try { fs.unlinkSync(tempLogPath); } catch (e) {}
          if (err) {
            logger.error(`❌ Erro no backup do container ${name}: ${err.message}`);
            reject(err);
          } else {
            logger.info(`✅ Backup do container ${name} concluído: ${filename}`);
            enforceRetention();
            resolve({ filename, id: filename.replace('.tar.gz', '') });
          }
        });
      } catch (e) {
        logger.error(`❌ Falha ao obter logs do container ${containerId}: ${e.message}`);
        reject(e);
      }
      return;
    }

    const filepath = path.join(backupDir, filename);
    let command = '';
    if (type === 'config') {
      command = `tar -czf "${filepath}" -C /app config.json`;
    } else if (type === 'logs') {
      command = `tar -czf "${filepath}" -C /app logs`;
    } else {
      // full backup
      const targets = fs.existsSync(path.join('/app', 'config.json')) ? 'logs config.json' : 'logs';
      command = `tar -czf "${filepath}" -C /app ${targets}`;
    }

    exec(command, (err) => {
      if (err) {
        logger.error(`❌ Erro no backup (${type}): ${err.message}`);
        reject(err);
      } else {
        logger.info(`✅ Backup (${type}) concluído: ${filename}`);
        enforceRetention();
        resolve({ filename, id: filename.replace('.tar.gz', '') });
      }
    });

    function enforceRetention() {
      try {
        const files = fs.readdirSync(backupDir)
          .filter(f => f.endsWith('.tar.gz'))
          .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time);
        
        if (files.length > globalSettings.maxBackups) {
          for (let i = globalSettings.maxBackups; i < files.length; i++) {
            fs.unlinkSync(path.join(backupDir, files[i].name));
            logger.info(`🧹 Backup antigo removido por retenção: ${files[i].name}`);
          }
        }
      } catch (e) {
        logger.error(`Erro na retenção de backups: ${e.message}`);
      }
    }
  });
}

app.get('/api/backups', (req, res) => {
  try {
    const backupDir = globalSettings.backupDir;
    const files = fs.existsSync(backupDir)
      ? fs.readdirSync(backupDir).filter(f => f.endsWith('.tar.gz')) : [];
    const backups = files.map(file => {
      const stat = fs.statSync(path.join(backupDir, file));
      return {
        id: file.replace('.tar.gz', ''), name: file,
        size: stat.size, sizeFormatted: formatBytes(stat.size),
        created: stat.mtime, type: 'manual'
      };
    }).sort((a, b) => b.created - a.created);
    res.json({ success: true, data: backups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/backups', async (req, res) => {
  try {
    const { type, containerId } = req.body;
    
    // Strict Input Validation
    const validTypes = ['full', 'logs', 'config', 'container'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Tipo de backup inválido' });
    }
    if (containerId && !/^[a-zA-Z0-9_-]+$/.test(containerId)) {
      return res.status(400).json({ success: false, error: 'ID de container inválido' });
    }

    const result = await runBackup(type || 'full', containerId || null);
    res.json({ success: true, message: 'Backup concluído com sucesso', id: result.id, name: result.filename });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/backups/:id', (req, res) => {
  try {
    // Sanitização contra Directory Traversal e Command Injection
    if (!/^[a-zA-Z0-9_-]+$/.test(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID de backup inválido' });
    }

    const backupDir = globalSettings.backupDir;
    const filename = `${req.params.id}.tar.gz`;
    const filepath = path.join(backupDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      logger.info(`🗑️ Backup removido manualmente: ${filename}`);
      res.json({ success: true, message: 'Backup deletado com sucesso' });
    } else {
      res.status(404).json({ success: false, error: 'Backup não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/backups/:id/restore', async (req, res) => {
  try {
    // Sanitização contra Directory Traversal e Command Injection
    if (!/^[a-zA-Z0-9_-]+$/.test(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID de backup inválido' });
    }

    const backupDir = globalSettings.backupDir;
    const filename = `${req.params.id}.tar.gz`;
    const filepath = path.join(backupDir, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: 'Backup não encontrado' });
    }

    logger.info(`🔄 Restauração iniciada para: ${filename}`);
    exec(`tar -xzf "${filepath}" -C /`, (err, stdout, stderr) => {
      if (err) {
        logger.error(`❌ Erro na restauração: ${err.message}`);
      } else {
        logger.info(`✅ Restauração concluída com sucesso: ${filename}`);
      }
    });

    res.json({ success: true, message: 'Restauração iniciada com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Dashboard (agregado) ====================
app.get('/api/dashboard', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const running = containers.filter(c => c.State === 'running').length;

    const backupDir = globalSettings.backupDir;
    const backupFiles = fs.existsSync(backupDir)
      ? fs.readdirSync(backupDir).filter(f => f.endsWith('.tar.gz')) : [];

    let latestBackup = null;
    if (backupFiles.length) {
      const newest = backupFiles
        .map(f => ({ f, m: fs.statSync(path.join(backupDir, f)).mtime }))
        .sort((a, b) => b.m - a.m)[0];
      latestBackup = { name: newest.f, created: newest.m };
    }

    let system = null;
    try { system = await collectSystemMetrics(); } catch (e) {}

    res.json({
      success: true,
      data: {
        containers: { total: containers.length, running, stopped: containers.length - running, unhealthy: 0 },
        backups: { total: backupFiles.length, latest: latestBackup },
        alerts: { active: activeAlerts.size, critical: criticalAlertsCount },
        system
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Helpers ====================
function parseStats(stats) {
  try {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats?.system_cpu_usage || 0);
    
    // Evita NaN ou divisão por zero caso systemDelta seja 0
    let cpuPercent = 0;
    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100;
    }
    
    // Tratamento de segurança para limites reais
    const parsedCpu = isNaN(cpuPercent) || !isFinite(cpuPercent) ? 0 : Math.max(0, Math.min(cpuPercent, 100));

    const memUsage = stats.memory_stats.usage || 0;
    const memLimit = stats.memory_stats.limit || 0;
    const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100 : 0;
    const parsedMem = isNaN(memPercent) || !isFinite(memPercent) ? 0 : Math.max(0, Math.min(memPercent, 100));

    return {
      cpu: { percent: parsedCpu.toFixed(1) },
      memory: {
        percent: parsedMem.toFixed(1),
        usage: formatBytes(memUsage), limit: formatBytes(memLimit)
      }
    };
  } catch (e) { return null; }
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) i = sizes.length - 1;
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==================== Jobs ====================
// Coleta de métricas para alimentar o histórico e checar limites/auto-restart
cron.schedule('*/30 * * * * *', async () => {
  let sample = null;
  try {
    sample = await collectSystemMetrics();
    pushSample(sample);
    // Checagem de limites e webhooks
    checkThresholds(sample);
  } catch (error) {
    logger.error('Erro coleta: ' + error.message);
  }

  // Verificação de auto-restart
  await checkContainersAutoRestart();

  // Coleta CPU/RAM por container para os gráficos individuais
  try {
    const running = await docker.listContainers();
    await Promise.all(running.map(async (c) => {
      try {
        const stats = await docker.getContainer(c.Id).stats({ stream: false });
        const parsed = parseStats(stats);
        if (parsed) {
          pushContainerSample(
            c.Id.substring(0, 12),
            c.Names[0]?.replace('/', '') || 'unknown',
            parseFloat(parsed.cpu.percent),
            parseFloat(parsed.memory.percent)
          );
        }
      } catch (e) {}
    }));
  } catch (e) {}
});

// Limpeza semanal domingo 04:00
cron.schedule('0 4 * * 0', async () => {
  logger.info('🧹 Limpeza automática iniciada');
  try {
    const pruneImages = await docker.pruneImages({ all: true });
    const pruneContainers = await docker.pruneContainers();
    const imgsCount = pruneImages.ImagesDeleted?.length || 0;
    const contsCount = pruneContainers.ContainersDeleted?.length || 0;
    logger.info(`🧹 Limpeza Concluída. Imagens removidas: ${imgsCount}, Containers removidos: ${contsCount}`);
    broadcastAlert('info', 'Limpeza Semanal Realizada', `A limpeza semanal foi concluída no VPS.\n- Imagens limpas: ${imgsCount}\n- Containers limpos: ${contsCount}`);
  } catch (e) {
    logger.error('Erro na limpeza automática: ' + e.message);
    broadcastAlert('warning', 'Falha na Limpeza Semanal', `Erro ao realizar a limpeza de containers e imagens órfãs: ${e.message}`);
  }
});

// ==================== Start ====================
app.listen(PORT, async () => {
  logger.info(`🚀 VPS Guardian Backend na porta ${PORT}`);
  docker.ping((err) => {
    logger.info(err ? '❌ Docker erro: ' + err.message : '✅ Docker conectado');
  });
  // Primeira amostra imediata para o gráfico não começar vazio
  try { pushSample(await collectSystemMetrics()); } catch (e) {}
});

module.exports = app;
