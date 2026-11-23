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

  const icons = { info: 'i-info', success: 'i-check', error: 'i-x', warning: 'i-alert' };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", type === 'error' ? "alert" : "status");
  toast.innerHTML = `
    <div class="toast-icon"><svg class="ic"><use href="#${icons[type] || icons.info}"/></svg></div>
    <div class="toast-message"></div>
    <button class="toast-close" aria-label="Fechar"><svg class="ic"><use href="#i-x"/></svg></button>
  `;
  toast.querySelector(".toast-message").textContent = message;
  container.appendChild(toast);

  // Limita a quantidade de toasts empilhados
  while (container.children.length > 4) container.firstElementChild.remove();

  requestAnimationFrame(() => toast.classList.add("show"));

  const removeToast = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  };
  setTimeout(removeToast, duration);
  toast.querySelector(".toast-close").addEventListener("click", removeToast);
}

// Visual do produto: foto real ou monograma colorido (quando não há foto)
const PLACEHOLDER_IMG = "img/FotoProduto.png";
function productVisual(p) {
  const initials = p.name.split(/\s+/).filter(w => w.length > 2 || /^[A-Z0-9]/.test(w))
    .slice(0, 2).map(w => w[0]).join("").toUpperCase() || p.name.slice(0, 2).toUpperCase();
  let h = 0;
  for (const c of p.name) h = (h * 31 + c.charCodeAt(0)) % 360;
  const mono = `<div class="monogram" style="--h:${h}">${escapeHtml(initials)}</div>`;
  if (!p.image || p.image === PLACEHOLDER_IMG) return mono;
  return `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" onerror="this.outerHTML=this.dataset.fb" data-fb='${mono.replace(/'/g, "&#39;")}' />`;
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
        <div class="log-entry-url">${escapeHtml(log.url)}</div>
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
    const open = panel.classList.toggle('open');
    const btn = $("btnToggleLog");
    if (btn) btn.classList.toggle('active', open);
  }
}