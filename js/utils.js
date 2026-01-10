// =========================
// FUNÇÕES AUXILIARES
// =========================

// DOM helper - seleciona elemento por ID
const $ = (id) => document.getElementById(id);

// Formata valor em Real Brasileiro
const fmtBRL = (n) => n.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

// =========================
// SISTEMA DE NOTIFICAÇÕES TOAST
// =========================

// Exibe uma notificação toast estilizada
// type: 'info', 'success', 'error', 'warning'
function showToast(message, type = 'info', duration = 4000) {
  const container = $("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  // Ícones por tipo
  const icons = {
    info: 'ℹ️',
    success: '✓',
    error: '✕',
    warning: '⚠️'
  };
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  // Animação de entrada
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);
  
  // Remover automaticamente após a duração
  const removeToast = () => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  };
  
  setTimeout(removeToast, duration);
  
  // Remover ao clicar no botão fechar
  toast.querySelector(".toast-close").addEventListener("click", removeToast);
}

// Aliases para facilitar o uso
function showError(message) { showToast(message, 'error', 5000); }
function showSuccess(message) { showToast(message, 'success', 4000); }
function showWarning(message) { showToast(message, 'warning', 4500); }
function showInfo(message) { showToast(message, 'info', 4000); }

// =========================
// SISTEMA DE LOG DE REQUISIÇÕES
// =========================

let requestLogs = [];

// Adiciona uma entrada de log de requisição
function addRequestLog(method, url, requestData, response, status, error = null) {
  const logEntry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleString('pt-BR'),
    method: method.toUpperCase(),
    url: url,
    request: requestData,
    response: response,
    status: status,
    error: error
  };
  
  requestLogs.unshift(logEntry); // Adiciona no início
  if (requestLogs.length > 100) {
    requestLogs = requestLogs.slice(0, 100); // Limita a 100 entradas
  }
  
  renderLogs();
}

// Renderiza os logs no painel
function renderLogs() {
  const logContent = $("logContent");
  if (!logContent) return;
  
  if (requestLogs.length === 0) {
    logContent.innerHTML = '<div class="log-empty">Nenhuma requisição registrada ainda.</div>';
    return;
  }
  
  logContent.innerHTML = requestLogs.map(log => {
    const statusClass = log.error ? 'error' : 'success';
    const statusText = log.error ? `Erro: ${log.status}` : `Status: ${log.status}`;
    
    const requestBody = log.request && typeof log.request === 'object' 
      ? JSON.stringify(log.request, null, 2) 
      : (log.request || 'N/A');
    
    const responseBody = log.response && typeof log.response === 'object'
      ? JSON.stringify(log.response, null, 2)
      : (log.response || (log.error ? log.error.message : 'N/A'));
    
    return `
      <div class="log-entry">
        <div class="log-entry-header">
          <span class="log-entry-method ${log.method}">${log.method}</span>
          <span class="log-entry-time">${log.timestamp}</span>
        </div>
        <div class="log-entry-url">${log.url}</div>
        <div class="log-entry-status ${statusClass}">${statusText}</div>
        <details class="log-entry-details">
          <summary>📤 Ver requisição</summary>
          <div class="log-entry-body">${escapeHtml(requestBody)}</div>
        </details>
        <details class="log-entry-details">
          <summary>📥 Ver resposta</summary>
          <div class="log-entry-body">${escapeHtml(responseBody)}</div>
        </details>
      </div>
    `;
  }).join('');
  
  // Scroll para o topo
  logContent.scrollTop = 0;
}

// Escapa HTML para segurança
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Limpa todos os logs
function clearRequestLogs() {
  requestLogs = [];
  renderLogs();
}

// Copia os logs para clipboard
async function copyRequestLogs() {
  try {
    const logsText = requestLogs.map(log => {
      return `[${log.timestamp}] ${log.method} ${log.url}\n` +
             `Status: ${log.status}\n` +
             `Request: ${JSON.stringify(log.request, null, 2)}\n` +
             `Response: ${JSON.stringify(log.response || log.error, null, 2)}\n` +
             `---\n`;
    }).join('\n');
    
    await navigator.clipboard.writeText(logsText);
    showSuccess('Logs copiados para a área de transferência!');
  } catch (e) {
    showError('Erro ao copiar logs: ' + e.message);
  }
}

// Mostra/oculta o painel de log
function toggleLogPanel() {
  const panel = $("logPanel");
  if (panel) {
    panel.classList.toggle('open');
  }
}