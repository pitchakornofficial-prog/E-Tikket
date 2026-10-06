// Prototype Interactive JavaScript

document.addEventListener("DOMContentLoaded", () => {
  initCountdownTimer();
  initTicketCalculator();
  initSlipUploadPreview();
  initScannerSimulator();
  initAdminVerification();
});

// 1. 15-Minute Reservation Countdown Timer
function initCountdownTimer() {
  const timerElement = document.getElementById("reservation-timer");
  if (!timerElement) return;

  let totalSeconds = 15 * 60; // 15 minutes
  const interval = setInterval(() => {
    if (totalSeconds <= 0) {
      clearInterval(interval);
      timerElement.textContent = "00:00 (EXPIRED)";
      timerElement.style.color = "#ef4444";
      const alertBox = document.getElementById("order-expired-msg");
      if (alertBox) alertBox.style.display = "block";
      const submitBtn = document.getElementById("submit-slip-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
      }
      return;
    }
    totalSeconds--;
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    timerElement.textContent = `${mins}:${secs}`;
  }, 1000);
}

// 2. Ticket Quantity & Platform Fee Calculator
function initTicketCalculator() {
  const qtySelect = document.getElementById("ticket-quantity");
  const subtotalDisplay = document.getElementById("subtotal-display");
  const feeDisplay = document.getElementById("fee-display");
  const totalDisplay = document.getElementById("total-display");

  if (!qtySelect || !subtotalDisplay || !totalDisplay) return;

  const basePrice = parseFloat(qtySelect.dataset.price || 399);

  function updatePrices() {
    const qty = parseInt(qtySelect.value, 10);
    const totalAmount = basePrice * qty;
    const feeAmount = (totalAmount * 0.05).toFixed(2); // 5% fee calculation

    subtotalDisplay.textContent = `${totalAmount.toLocaleString()} THB`;
    if (feeDisplay) {
      feeDisplay.textContent = `(รวม Platform Fee 5%: ${feeAmount} THB)`;
    }
    totalDisplay.textContent = `${totalAmount.toLocaleString()} THB`;
  }

  qtySelect.addEventListener("change", updatePrices);
  updatePrices();
}

// 3. Slip Upload Preview Mock
function initSlipUploadPreview() {
  const slipInput = document.getElementById("slip-file-input");
  const previewContainer = document.getElementById("slip-preview-container");
  const previewImage = document.getElementById("slip-preview-img");
  const submitBtn = document.getElementById("submit-slip-btn");
  const successNotice = document.getElementById("upload-success-notice");

  if (!slipInput || !previewContainer || !previewImage) return;

  slipInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        previewImage.src = event.target.result;
        previewContainer.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  if (submitBtn && successNotice) {
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!slipInput.files.length && !previewImage.src) {
        alert("กรุณาเลือกไฟล์สลิปการโอนเงินก่อนยืนยัน");
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "กำลังอัปโหลดสลิป...";
      setTimeout(() => {
        submitBtn.style.display = "none";
        successNotice.style.display = "block";
        const orderStatusBadge = document.getElementById("order-status-badge");
        if (orderStatusBadge) {
          orderStatusBadge.className = "badge badge-pending";
          orderStatusBadge.textContent = "WAITING_FOR_VERIFY";
        }
      }, 700);
    });
  }
}

// 4. Scanner Simulation with Re-entry
function initScannerSimulator() {
  const scanActionSelect = document.getElementById("scan-action");
  const resultModal = document.getElementById("scan-result-modal");
  const resultTitle = document.getElementById("scan-result-title");
  const resultBody = document.getElementById("scan-result-body");
  const scanLogTable = document.getElementById("scan-log-tbody");

  if (!resultModal || !scanActionSelect) return;

  // Mock tickets state in memory for demo
  const mockTickets = {
    "TKT-00125-01": { status: "OUTSIDE", eventId: "EVT-01", name: "Summer Live Concert" },
    "TKT-00125-02": { status: "INSIDE", eventId: "EVT-01", name: "Summer Live Concert" },
    "TKT-00125-03": { status: "CANCELLED", eventId: "EVT-01", name: "Summer Live Concert" }
  };

  window.simulateScan = function (ticketKey) {
    const action = scanActionSelect.value; // 'CHECK_IN' or 'CHECK_OUT'
    const ticket = mockTickets[ticketKey];

    resultModal.style.display = "block";

    if (!ticket) {
      // Invalid
      resultModal.className = "modal-feedback bg-danger";
      resultTitle.textContent = "INVALID TICKET";
      resultBody.innerHTML = `<p>ไม่พบบัตรในระบบ หรือรหัส QR ไม่ถูกต้อง</p>`;
      return;
    }

    if (ticket.status === "CANCELLED") {
      resultModal.className = "modal-feedback bg-danger";
      resultTitle.textContent = "INVALID TICKET";
      resultBody.innerHTML = `<p>บัตร #${ticketKey} ถูกยกเลิกแล้ว</p>`;
      return;
    }

    if (action === "CHECK_IN") {
      if (ticket.status === "INSIDE") {
        resultModal.className = "modal-feedback bg-pending";
        resultTitle.textContent = "ALREADY CHECKED IN";
        resultBody.innerHTML = `
          <p><strong>บัตร #${ticketKey}</strong> สแกนเข้างานไปแล้ว!</p>
          <p class="text-muted">กรุณาตรวจสอบว่ามีผู้ใช้บัตรนี้เข้าไปก่อนหน้านี้หรือไม่</p>
        `;
      } else {
        ticket.status = "INSIDE";
        resultModal.className = "modal-feedback bg-success";
        resultTitle.textContent = "VALID TICKET (CHECKED IN)";
        resultBody.innerHTML = `
          <p><strong>บัตร #${ticketKey}</strong></p>
          <p>งาน: ${ticket.name}</p>
          <p>สถานะใหม่: <span class="badge badge-inside">INSIDE</span></p>
        `;
        appendLog(ticketKey, "CHECK_IN", "PASS");
      }
    } else if (action === "CHECK_OUT") {
      if (ticket.status === "OUTSIDE") {
        resultModal.className = "modal-feedback bg-pending";
        resultTitle.textContent = "CANNOT CHECK OUT";
        resultBody.innerHTML = `<p>บัตร #${ticketKey} ยังไม่ได้สแกนเข้างาน</p>`;
      } else {
        ticket.status = "OUTSIDE";
        resultModal.className = "modal-feedback bg-success";
        resultTitle.textContent = "CHECKED OUT (RE-ENTRY READY)";
        resultBody.innerHTML = `
          <p><strong>บัตร #${ticketKey}</strong> ออกจากงานชั่วคราว</p>
          <p>สถานะใหม่: <span class="badge badge-outline">OUTSIDE</span></p>
        `;
        appendLog(ticketKey, "CHECK_OUT", "PASS");
      }
    }
  };

  function appendLog(ticketId, action, result) {
    if (!scanLogTable) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${timeStr}</td>
      <td><strong>${ticketId}</strong></td>
      <td><span class="badge ${action === 'CHECK_IN' ? 'badge-success' : 'badge-outline'}">${action}</span></td>
      <td><span class="badge badge-success">${result}</span></td>
      <td>Staff #STF-01</td>
    `;
    scanLogTable.insertBefore(row, scanLogTable.firstChild);
  }

  window.closeModal = function () {
    resultModal.style.display = "none";
  };
}

// 5. Admin Verification Mock
function initAdminVerification() {
  window.approveOrder = function (btn, orderId) {
    const row = btn.closest("tr");
    if (!row) return;
    btn.disabled = true;
    btn.textContent = "อนุมัติแล้ว";
    const statusCell = row.querySelector(".order-status-col");
    if (statusCell) {
      statusCell.innerHTML = `<span class="badge badge-success">PAID</span>`;
    }
    const actionsCell = row.querySelector(".order-actions-col");
    if (actionsCell) {
      actionsCell.innerHTML = `<small style="color:#10b981;">สร้างบัตรและส่งอีเมลแล้ว</small>`;
    }
    alert(`อนุมัติคำสั่งซื้อ #${orderId} เรียบร้อยแล้ว! ระบบจำลองสร้างบัตรและส่งอีเมล E-Ticket ไปยังลูกค้าเรียบร้อย`);
  };

  window.rejectOrder = function (btn, orderId) {
    const reason = prompt("กรุณาระบุเหตุผลการปฏิเสธสลิป (เช่น ยอดเงินไม่ตรง หรือสลิปไม่ชัดเจน):", "ยอดเงินโอนไม่ตรงกับคำสั่งซื้อ");
    if (!reason) return;
    const row = btn.closest("tr");
    if (!row) return;
    const statusCell = row.querySelector(".order-status-col");
    if (statusCell) {
      statusCell.innerHTML = `<span class="badge badge-danger">REJECTED</span>`;
    }
    const actionsCell = row.querySelector(".order-actions-col");
    if (actionsCell) {
      actionsCell.innerHTML = `<small style="color:#f87171;">ปฏิเสธแล้ว (${reason})</small>`;
    }
  };
}
