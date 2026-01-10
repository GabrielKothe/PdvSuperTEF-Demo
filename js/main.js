// =========================
// INICIALIZAÇÃO E EVENTOS
// =========================

// Handler para mudança de forma de pagamento
function onMethodChange() {
  const method = $("payMethod").value;
  $("instWrap").style.display = (method === "credit_inst") ? "block" : "none";
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Pagamento
  $("btnPay").addEventListener("click", startPayment);
  $("btnClear").addEventListener("click", clearCart);
  $("payMethod").addEventListener("change", onMethodChange);

  // Modal de pagamento - Botão Fechar/Cancelar
  $("btnCancelTef").addEventListener("click", async () => {
    const status = Number($("pstatus").textContent || "0");
    
    // Se status for 1 (aguardando) e tiver payment_uniqueid, cancelar solicitação
    if (status === 1 && currentPaymentId) {
      await cancelarSolicitacaoPagamento();
    } else {
      // Caso contrário, apenas fechar o modal
      stopPolling();
      closeModal();
    }
  });

  $("btnCloseOk").addEventListener("click", () => {
    stopPolling();
    closeModal();
  });

  // Configurações
  $("btnConfig").addEventListener("click", openConfig);
  $("btnSaveConfig").addEventListener("click", saveConfig);
  $("btnCancelConfig").addEventListener("click", closeConfig);
  $("btnCloseConfig").addEventListener("click", closeConfig);
  
  // Checkbox Listar POS
  const cfgListarPos = document.getElementById("cfgListarPos");
  if (cfgListarPos) {
    cfgListarPos.addEventListener("change", updatePosIdField);
  }

  // Modal de Seleção de POS
  $("btnClosePosSelect").addEventListener("click", closePosSelectModal);
  $("btnCancelPosSelect").addEventListener("click", closePosSelectModal);

  // Inicialização
  renderProducts();
  renderCart();
  onMethodChange();
});
