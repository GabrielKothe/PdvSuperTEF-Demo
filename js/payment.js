// =========================
// PAGAMENTO E POLLING
// =========================
//
// O status do pagamento é consultado em GET /pagamentos/by-uniqueid/{id}
// ("detalhar pagamento") a cada POLL_MS (4s).
//
// Regras para evitar HTTP 429 (Too Many Requests):
//  - Usa setTimeout encadeado (e não setInterval): a próxima consulta só é
//    agendada DEPOIS que a anterior termina, então nunca há requisições
//    sobrepostas quando a API demora para responder.
//  - A primeira consulta acontece POLL_MS após o POST (não imediatamente).
//  - Se a API responder 429, respeita o header Retry-After ou dobra o
//    intervalo (até POLL_MAX_BACKOFF_MS) antes de tentar de novo.
//  - Cada pagamento tem uma "sessão" de polling; consultas de um pagamento
//    anterior são descartadas e nunca reagendadas.

let pollTimer = null;
let pollSession = 0;
let pollDelay = POLL_MS;
let currentPaymentId = null;
let currentStatus = 0;
let pollingTimeout = null;
let countdownTimer = null;
let countdownStartTime = null;
const POLLING_TIMEOUT_MS = 60000; // 1 minuto

const STATUS_LABELS = { 1: "Aguardando", 4: "Pago", 5: "Cancelado" };
const METHOD_LABELS = {
  debit: "Débito", credit: "Crédito à vista", credit_inst: "Crédito parcelado",
  pix: "PIX", voucher: "Voucher"
};

// Atualiza o status atual em memória e na tela
function setStatus(st) {
  currentStatus = st;
  $("pstatus").textContent = String(st);
  $("pstatusLabel").textContent = STATUS_LABELS[st]
    ? `${STATUS_LABELS[st]} (${st})`
    : `Processando (${st})`;
  setBadge(st);
  updateCancelButton();
}

// Exibe o resultado final no modal
function showPaymentResult(kind, title, sub) {
  $("statusArea").style.display = "none";
  $("successArea").style.display = kind === "success" ? "flex" : "none";
  $("canceledArea").style.display = kind === "success" ? "none" : "flex";
  $("modalTitle").textContent = title;
  $("modalSub").textContent = sub;
  if (kind !== "success") $("canceledHint").textContent = sub;
  $("btnCloseOk").style.display = "inline-flex";
  $("btnCloseOk").textContent = kind === "success" ? "Nova venda" : "Fechar";
  $("btnCancelTef").style.display = "none";
  stopAllPaymentTimers();
  if (kind === "success") {
    clearCart();
    newOrderId();
  }
  setTimeout(() => $("btnCloseOk").focus(), 50);
}

function stopAllPaymentTimers() {
  stopPolling();
  clearPollingTimeout();
  stopCountdown();
}

// Inicia o processo de pagamento
async function startPayment() {
  const { total, items } = cartTotals();

  const token = localStorage.getItem("supertef_token");
  const cliente = localStorage.getItem("supertef_cliente_chave");

  if (!token || !cliente) {
    showWarning("PDV não configurado. Abra as Configurações.");
    openConfig();
    return;
  }
  if (items <= 0) {
    showWarning("Carrinho vazio.");
    return;
  }
  if ($("modal").classList.contains("open")) return; // já há um pagamento em andamento

  const listarPos = localStorage.getItem("supertef_listar_pos") === "true";
  if (listarPos) {
    await openPosSelectModal(() => proceedWithPayment(total, items));
    return;
  }
  proceedWithPayment(total, items);
}

// Procede com o pagamento após verificar/selecionar POS
async function proceedWithPayment(total, items) {
  let payload;
  try {
    payload = buildPaymentPayload(total);
  } catch (e) {
    showError(e.message);
    return;
  }

  stopAllPaymentTimers();
  currentPaymentId = null;
  resetModalState();

  const method = METHOD_LABELS[getSelectedPaymentMethod()] || "";
  const inst = payload.installment_count > 1 ? ` em ${payload.installment_count}x` : "";
  $("modalTitle").textContent = `Cobrando ${fmtBRL(total)}`;
  $("modalSub").textContent = `${method}${inst} · ${items} ${items === 1 ? "item" : "itens"}`;
  openModal();

  toastLog("Enviando solicitação de pagamento (POST /pagamentos) ...");
  toastLog("Payload: " + JSON.stringify(payload));

  // Bloquear o botão de cancelar enquanto o POST não retorna
  $("btnCancelTef").disabled = true;
  $("btnCancelTef").textContent = "Enviando…";

  let resp;
  try {
    resp = await apiFetch("/pagamentos", { method: "POST", body: JSON.stringify(payload) });
  } catch (e) {
    toastLog("Erro ao solicitar: " + e.message);
    setBadge(5);
    showPaymentResult("canceled", "Falha ao solicitar pagamento", e.message);
    return;
  }

  currentPaymentId = resp?.payment_uniqueid;
  if (!currentPaymentId) {
    toastLog("Resposta sem payment_uniqueid. Verifique a API.");
    setBadge(5);
    showPaymentResult("canceled", "Resposta inesperada", "A API não retornou o ID do pagamento.");
    return;
  }

  $("pid").textContent = String(currentPaymentId);
  $("pid").title = String(currentPaymentId);
  const initialStatus = Number(resp.payment_status ?? 1);
  setStatus(initialStatus);
  toastLog("Solicitado com sucesso. payment_uniqueid=" + currentPaymentId);

  if (initialStatus === 5) {
    showPaymentResult("canceled", "Pagamento cancelado", "Transação cancelada");
    return;
  }
  if (initialStatus === 4) {
    showPaymentResult("success", "Venda concluída", "Pagamento confirmado");
    return;
  }

  // Timeout de 1 minuto + contador
  pollingTimeout = setTimeout(handlePollingTimeout, POLLING_TIMEOUT_MS);
  startCountdown();

  // Inicia o polling (primeira consulta em POLL_MS)
  startPolling(currentPaymentId);
}

// Inicia uma nova sessão de polling para o pagamento
function startPolling(pid) {
  stopPolling();
  pollSession++;
  pollDelay = POLL_MS;
  scheduleNextPoll(pid, pollSession, POLL_MS);
}

function scheduleNextPoll(pid, session, delay) {
  if (session !== pollSession) return;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => pollPayment(pid, session), delay);
}

// Consulta o status do pagamento (uma vez) e agenda a próxima consulta
async function pollPayment(pid, session) {
  pollTimer = null;
  if (session !== pollSession) return;

  try {
    toastLog(`Consultando status (GET /pagamentos/by-uniqueid/${pid}) ...`);
    const data = await apiFetch(`/pagamentos/by-uniqueid/${encodeURIComponent(pid)}`, { method: "GET" });

    // Pagamento mudou ou polling foi parado enquanto aguardava a resposta
    if (session !== pollSession) return;

    pollDelay = POLL_MS; // resposta OK: volta ao intervalo normal
    const st = Number(data?.payment_status);
    if (!Number.isNaN(st)) setStatus(st);

    if (st === 4) {
      toastLog("Pagamento aprovado (status 4).");
      showPaymentResult("success", "Venda concluída", "Pagamento confirmado");
      return;
    }
    if (st === 5) {
      toastLog("Pagamento cancelado (status 5).");
      showPaymentResult("canceled", "Pagamento cancelado", data?.payment_message || "Transação cancelada");
      return;
    }
  } catch (e) {
    if (session !== pollSession) return;
    if (e.status === 429) {
      pollDelay = Math.max(e.retryAfterMs || 0, Math.min(pollDelay * 2, POLL_MAX_BACKOFF_MS));
      toastLog(`Limite de requisições atingido (429). Nova consulta em ${Math.round(pollDelay / 1000)}s.`);
    } else {
      pollDelay = POLL_MS;
      toastLog("Erro no polling: " + e.message);
    }
  }

  scheduleNextPoll(pid, session, pollDelay);
}

// Para o polling (invalida a sessão atual)
function stopPolling() {
  pollSession++;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function clearPollingTimeout() {
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    pollingTimeout = null;
  }
}

// Contador regressivo
function startCountdown() {
  stopCountdown();
  const counterElement = $("timeoutCounter");
  const timeElement = $("timeoutTime");
  if (!counterElement || !timeElement) return;

  counterElement.style.display = "block";
  countdownStartTime = Date.now();
  updateCountdownDisplay(POLLING_TIMEOUT_MS);

  countdownTimer = setInterval(() => {
    const remaining = Math.max(0, POLLING_TIMEOUT_MS - (Date.now() - countdownStartTime));
    updateCountdownDisplay(remaining);
    if (remaining <= 0) stopCountdown(true);
  }, 1000);
}

function updateCountdownDisplay(remainingMs) {
  const timeElement = $("timeoutTime");
  const bar = $("timeoutBar");
  const seconds = Math.ceil(remainingMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (timeElement) {
    timeElement.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    timeElement.classList.toggle("warning", seconds <= 10);
  }
  if (bar) {
    bar.style.width = `${(remainingMs / POLLING_TIMEOUT_MS) * 100}%`;
    bar.classList.toggle("warning", seconds <= 10);
  }
}

function stopCountdown(keepVisible = false) {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  countdownStartTime = null;
  if (!keepVisible) {
    const counterElement = $("timeoutCounter");
    if (counterElement) counterElement.style.display = "none";
  }
}

// Timeout de 1 minuto — cancela o pagamento automaticamente
async function handlePollingTimeout() {
  toastLog("Timeout: 1 minuto sem resposta final. Cancelando automaticamente...");
  stopPolling();
  clearPollingTimeout();
  stopCountdown();

  if (currentPaymentId && currentStatus === 1) {
    try {
      const response = await cancelarPagamento(currentPaymentId);
      toastLog(`Resposta do cancelamento automático: ${JSON.stringify(response)}`);
    } catch (e) {
      toastLog(`Erro ao cancelar automaticamente: ${e.message}`);
    }
  }

  setStatus(5);
  showPaymentResult("canceled", "Tempo esgotado", "Cancelado automaticamente após 1 minuto sem resposta");
  showError("Tempo de espera esgotado. O pagamento foi cancelado automaticamente.");
}

// Cancela a solicitação de pagamento (só se status = 1)
async function cancelarSolicitacaoPagamento() {
  if (!currentPaymentId || currentStatus !== 1) {
    stopAllPaymentTimers();
    closeModal();
    return;
  }

  const pidToCancel = String(currentPaymentId).trim();
  const btn = $("btnCancelTef");
  btn.disabled = true;
  btn.textContent = "Cancelando…";

  // Pausa o polling durante o cancelamento para não somar requisições
  stopPolling();
  toastLog(`Cancelando solicitação (payment_uniqueid: ${pidToCancel})...`);

  try {
    const response = await cancelarPagamento(pidToCancel);
    toastLog(`Resposta recebida: ${JSON.stringify(response)}`);
    if (!response) throw new Error("Resposta vazia da API");

    if (response.status === true || response.status === "true") {
      setStatus(Number(response.data?.payment_status ?? 5));
      showPaymentResult("canceled", "Pagamento cancelado",
        response.data?.payment_message || response.message || "Transação cancelada pelo operador");
      return;
    }
    throw new Error(response.message || "Não foi possível cancelar o pagamento");
  } catch (e) {
    toastLog(`Erro ao cancelar: ${e.message}`);
    showError(`Erro ao cancelar: ${e.message}`);
    updateCancelButton();
    // Retoma o polling, pois o pagamento continua em andamento
    if (currentPaymentId && currentStatus === 1 && pollingTimeout) startPolling(currentPaymentId);
  }
}

// Atualiza o texto do botão de cancelar/fechar
function updateCancelButton() {
  const btn = $("btnCancelTef");
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = (currentStatus === 1 && currentPaymentId) ? "Cancelar cobrança" : "Fechar";
}
