// ==========================================================================
// E-TIKKET 9-Page Prototype Master Controller (v6)
// Font: Kanit | Strictly Vector SVG Icons | Clean Monochrome + Electric Lime
// Pages: 1. Home, 2. Detail, 3. Queue, 4. Checkout, 5. Payment, 6. Tickets,
//        7. Lookup, 8. Scanner, 9. News
// ==========================================================================

const PROTOTYPE_ORDER_KEY = 'etikket-prototype-v4-order';

const DEFAULT_ORDER = {
  event: 'summer',
  eventName: 'Indie Live Wave 2026',
  eventDate: 'เสาร์ที่ 24 ตุลาคม 2026 • 18:00 น.',
  eventVenue: 'The Riverfront Warehouse (เจริญกรุง), กรุงเทพฯ',
  poster: 'poster-summer.svg',
  regularPrice: 150,
  studentPrice: 79,
  quantity: 1,
  name: 'วรพจน์ สิทธิชัย',
  phone: '089-765-4321',
  email: 'student@ubu.ac.th',
  isStudent: false,
  unitPrice: 150,
  totalDiscount: 0,
  totalAmount: 150,
  otpVerified: false,
  status: 'PENDING_PAYMENT',
  ticketNumber: 'TKT-202610-8839-01'
};

const getOrder = () => {
  try {
    const raw = sessionStorage.getItem(PROTOTYPE_ORDER_KEY);
    return raw ? JSON.parse(raw) : { ...DEFAULT_ORDER };
  } catch (e) {
    return { ...DEFAULT_ORDER };
  }
};

const saveOrder = (data) => {
  sessionStorage.setItem(PROTOTYPE_ORDER_KEY, JSON.stringify(data));
};

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.prototypePage;
  
  initLiveSearch();

  switch (page) {
    case 'waiting-room':
      initWaitingRoom();
      break;
    case 'checkout':
      initCheckoutV4();
      break;
    case 'payment':
      initPaymentV4();
      break;
    case 'tickets':
      initTicketsV4();
      break;
    case 'lookup':
      initLookupV1();
      break;
    case 'scanner':
      initScannerV4();
      break;
    default:
      break;
  }
});

// 1. Instant Live Search (Header on Homepage)
function initLiveSearch() {
  const searchInput = document.getElementById('live-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.vertical-event-card');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(query) ? 'flex' : 'none';
    });
  });
}

// 2. Virtual Waiting Room (waiting-room.html - waiting-v2)
function initWaitingRoom() {
  const skipBtn = document.getElementById('skip-queue-btn');
  const posEl = document.getElementById('queue-position');
  const barEl = document.getElementById('queue-progress-bar');
  const percentEl = document.getElementById('queue-percent');
  const timeEl = document.getElementById('queue-eta');

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      location.href = 'checkout.html?event=summer';
    });
  }

  let pos = 42;
  let percent = 35;
  const timer = setInterval(() => {
    if (pos > 1) {
      pos -= Math.floor(Math.random() * 4) + 1;
      if (pos < 1) pos = 1;
      percent = Math.min(98, percent + Math.floor(Math.random() * 8) + 2);
      
      if (posEl) posEl.textContent = pos;
      if (barEl) barEl.style.width = percent + '%';
      if (percentEl) percentEl.textContent = percent + '%';
      if (timeEl) timeEl.textContent = `อีกประมาณ 00:${String(Math.max(5, pos * 2)).padStart(2, '0')} นาที`;
      
      if (pos === 1) {
        clearInterval(timer);
        if (timeEl) timeEl.textContent = 'ถึงคิวของคุณแล้ว!';
        setTimeout(() => {
          location.href = 'checkout.html?event=summer';
        }, 1000);
      }
    }
  }, 2200);
}

// 3. Checkout Step 1: Single Column, Stepper, 6-Box OTP, Deferred Student Discount (checkout-v5)
function initCheckoutV4() {
  const order = getOrder();

  const qtyInput = document.getElementById('ticket-qty');
  const plusBtn = document.getElementById('qty-plus');
  const minusBtn = document.getElementById('qty-minus');

  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const emailInput = document.getElementById('cust-email');
  const emailDisplay = document.getElementById('otp-target-email-display');

  const priceRowLabel = document.getElementById('price-row-label');
  const subtotalAmount = document.getElementById('subtotal-amount');
  const discountRow = document.getElementById('discount-row');
  const discountRowLabel = document.getElementById('discount-row-label');
  const discountAmount = document.getElementById('discount-amount');
  const grandTotal = document.getElementById('grand-total');

  const promoInput = document.getElementById('promo-code');
  const applyPromoBtn = document.getElementById('apply-promo-btn');
  const promoMsg = document.getElementById('promo-msg');

  const requestOtpBtn = document.getElementById('request-otp-btn');
  const timerBanner = document.getElementById('reservation-timer-banner');
  const timerDisplay = document.getElementById('timer-display');
  const otpInputArea = document.getElementById('otp-input-area');
  const otpDigitsContainer = document.getElementById('otp-inputs-container');
  const verifyOtpBtn = document.getElementById('verify-otp-btn');
  const discountBadge = document.getElementById('otp-verified-discount-badge');
  const proceedBtn = document.getElementById('proceed-to-payment-btn');

  let currentQty = order.quantity || 1;
  let promoDiscount = 0;
  let isVerified = order.otpVerified || false;
  let isStudent = false;

  function updateEmailDisplay() {
    const emailVal = emailInput ? emailInput.value.trim() : '';
    if (emailDisplay) {
      emailDisplay.textContent = emailVal || '(ยังไม่ได้ระบุอีเมล)';
    }
  }

  function recalculate() {
    const emailVal = emailInput ? emailInput.value.trim().toLowerCase() : '';
    // Student discount applies ONLY if OTP is verified AND email ends with @ubu.ac.th
    isStudent = isVerified && emailVal.endsWith('@ubu.ac.th');

    const baseSubtotal = currentQty * order.regularPrice;
    let unitDiscount = isStudent ? (order.regularPrice - order.studentPrice) : 0; // 150 - 79 = 71
    let totalDiscount = (currentQty * unitDiscount) + promoDiscount;
    let total = baseSubtotal - totalDiscount;
    if (total < 0) total = 0;

    if (discountBadge) {
      discountBadge.style.display = isStudent ? 'flex' : 'none';
    }

    if (discountRow) {
      discountRow.style.display = totalDiscount > 0 ? 'flex' : 'none';
      if (discountRowLabel) {
        if (isStudent && promoDiscount > 0) {
          discountRowLabel.textContent = `ส่วนลดนักศึกษา (@ubu.ac.th) + โค้ดลด ฿${promoDiscount}`;
        } else if (isStudent) {
          discountRowLabel.textContent = `ส่วนลดนักศึกษา (@ubu.ac.th)`;
        } else {
          discountRowLabel.textContent = `ส่วนลดโค้ดโปรโมชัน`;
        }
      }
    }

    if (priceRowLabel) priceRowLabel.textContent = `บัตรเข้างาน (${currentQty} ใบ × ฿${order.regularPrice})`;
    if (subtotalAmount) subtotalAmount.textContent = `฿${baseSubtotal}`;
    if (discountAmount) discountAmount.textContent = `-฿${totalDiscount}`;
    if (grandTotal) grandTotal.textContent = `฿${total}`;

    // Sync to in-memory order
    order.quantity = currentQty;
    order.isStudent = isStudent;
    order.unitPrice = isStudent ? order.studentPrice : order.regularPrice;
    order.totalDiscount = totalDiscount;
    order.totalAmount = total;
    order.otpVerified = isVerified;
    if (nameInput) order.name = nameInput.value.trim();
    if (phoneInput) order.phone = phoneInput.value.trim();
    if (emailInput) order.email = emailVal;
    saveOrder(order);
  }

  if (plusBtn && qtyInput) {
    plusBtn.addEventListener('click', () => {
      if (currentQty < 4) {
        currentQty++;
        qtyInput.value = currentQty;
        recalculate();
      }
    });
  }

  if (minusBtn && qtyInput) {
    minusBtn.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyInput.value = currentQty;
        recalculate();
      }
    });
  }

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      updateEmailDisplay();
      if (isVerified) {
        // If email changed after verification, require re-verification
        isVerified = false;
        if (verifyOtpBtn) {
          verifyOtpBtn.disabled = false;
          verifyOtpBtn.classList.remove('btn-dark');
          verifyOtpBtn.classList.add('btn-lime');
          verifyOtpBtn.innerHTML = '<span>ยืนยัน OTP</span>';
        }
        if (proceedBtn) proceedBtn.disabled = true;
      }
      recalculate();
    });
    updateEmailDisplay();
  }

  if (applyPromoBtn && promoInput) {
    applyPromoBtn.addEventListener('click', () => {
      const code = promoInput.value.trim().toUpperCase();
      if (code === 'INDIE2026' || code === 'SPECIAL') {
        promoDiscount = 20;
        if (promoMsg) {
          promoMsg.textContent = `✓ ใช้โค้ด ${code} สำเร็จ รับส่วนลดเพิ่ม ฿20`;
          promoMsg.style.color = '#10b981';
        }
        recalculate();
      } else if (code) {
        promoDiscount = 0;
        if (promoMsg) {
          promoMsg.textContent = '✕ โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ';
          promoMsg.style.color = '#ef4444';
        }
        recalculate();
      }
    });
  }

  // 10-Minute Hold Timer
  let holdSeconds = 600;
  let holdInterval = null;

  if (requestOtpBtn) {
    requestOtpBtn.addEventListener('click', () => {
      const emailVal = emailInput ? emailInput.value.trim() : '';
      if (!emailVal || !emailVal.includes('@')) {
        alert('กรุณากรอกอีเมลให้ถูกต้องก่อนขอรหัส OTP');
        if (emailInput) emailInput.focus();
        return;
      }

      updateEmailDisplay();
      if (timerBanner) timerBanner.style.display = 'flex';
      if (otpInputArea) otpInputArea.style.display = 'flex';

      const firstBox = otpDigitsContainer ? otpDigitsContainer.querySelector('.otp-digit-box') : null;
      if (firstBox) firstBox.focus();

      requestOtpBtn.disabled = true;
      requestOtpBtn.innerHTML = '<span>ส่งรหัสแล้ว</span>';

      if (!holdInterval) {
        holdInterval = setInterval(() => {
          if (holdSeconds > 0) {
            holdSeconds--;
            const mins = String(Math.floor(holdSeconds / 60)).padStart(2, '0');
            const secs = String(holdSeconds % 60).padStart(2, '0');
            if (timerDisplay) timerDisplay.textContent = `${mins}:${secs}`;
          } else {
            clearInterval(holdInterval);
            alert('หมดเวลาล็อกโควตาบัตร กรุณาทำรายการใหม่');
            location.reload();
          }
        }, 1000);
      }
    });
  }

  // OTP 6 individual digit boxes navigation
  if (otpDigitsContainer) {
    const digitBoxes = Array.from(otpDigitsContainer.querySelectorAll('.otp-digit-box'));
    
    digitBoxes.forEach((box, index) => {
      box.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[0] : '';
        if (val && index < digitBoxes.length - 1) {
          digitBoxes[index + 1].focus();
        }
      });

      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && index > 0) {
          digitBoxes[index - 1].focus();
        }
      });

      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        for (let i = 0; i < digitBoxes.length; i++) {
          digitBoxes[i].value = pasted[i] || '';
        }
        const nextIndex = Math.min(pasted.length, digitBoxes.length - 1);
        digitBoxes[nextIndex].focus();
      });
    });
  }

  // Verify OTP button
  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
      let code = '';
      if (otpDigitsContainer) {
        const boxes = otpDigitsContainer.querySelectorAll('.otp-digit-box');
        boxes.forEach(b => { code += b.value; });
      }

      if (code.length === 6) {
        isVerified = true;
        recalculate();

        verifyOtpBtn.classList.remove('btn-lime');
        verifyOtpBtn.classList.add('btn-dark');
        verifyOtpBtn.innerHTML = '<span>✓ ยืนยัน OTP สำเร็จ</span>';
        verifyOtpBtn.disabled = true;

        if (otpDigitsContainer) {
          const boxes = otpDigitsContainer.querySelectorAll('.otp-digit-box');
          boxes.forEach(b => { b.readOnly = true; });
        }

        if (proceedBtn) {
          proceedBtn.disabled = false;
          proceedBtn.focus();
        }
      } else {
        alert('กรุณากรอกรหัส OTP ให้ครบทั้ง 6 หลัก (ทดสอบ: 1 2 3 4 5 6)');
      }
    });
  }

  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      recalculate();
      location.href = 'payment.html';
    });
  }

  recalculate();
}

// 4. Payment Step 2: PromptPay QR Gateway Slip & Order Summary (payment-v5)
function initPaymentV4() {
  const order = getOrder();

  const amountEl = document.getElementById('payment-amount');
  const timerEl = document.getElementById('payment-timer');
  const statusBox = document.getElementById('payment-status-box');
  const statusText = document.getElementById('payment-status-text');
  const simulatePaidBtn = document.getElementById('simulate-paid-btn');

  // Fill in order details in full summary card
  const buyerName = document.getElementById('summary-buyer-name');
  const buyerPhone = document.getElementById('summary-buyer-phone');
  const buyerEmail = document.getElementById('summary-buyer-email');
  const summaryQty = document.getElementById('summary-qty');
  const summaryBasePrice = document.getElementById('summary-base-price');
  const summaryDiscountRow = document.getElementById('summary-discount-row');
  const summaryDiscountLbl = document.getElementById('summary-discount-lbl');
  const summaryDiscountVal = document.getElementById('summary-discount-val');
  const summaryGrandTotal = document.getElementById('summary-grand-total');

  const qty = order.quantity || 1;
  const baseSubtotal = qty * (order.regularPrice || 150);
  const totalAmount = order.totalAmount !== undefined ? order.totalAmount : 79;
  const totalDiscount = order.totalDiscount !== undefined ? order.totalDiscount : (baseSubtotal - totalAmount);

  if (amountEl) amountEl.textContent = `฿${totalAmount}.00`;
  if (buyerName && order.name) buyerName.textContent = order.name;
  if (buyerPhone && order.phone) buyerPhone.textContent = order.phone;
  if (buyerEmail && order.email) buyerEmail.textContent = order.email;
  if (summaryQty) summaryQty.textContent = `${qty} ใบ`;
  if (summaryBasePrice) summaryBasePrice.textContent = `฿${baseSubtotal}.00`;
  if (summaryGrandTotal) summaryGrandTotal.textContent = `฿${totalAmount}.00`;

  if (summaryDiscountRow) {
    summaryDiscountRow.style.display = totalDiscount > 0 ? 'flex' : 'none';
    if (summaryDiscountVal) summaryDiscountVal.textContent = `-฿${totalDiscount}.00`;
    if (summaryDiscountLbl) {
      summaryDiscountLbl.textContent = order.isStudent ? 'ส่วนลดนักศึกษา (@ubu.ac.th)' : 'ส่วนลดโปรโมชัน';
    }
  }

  let seconds = 582;
  const payTimer = setInterval(() => {
    if (seconds > 0) {
      seconds--;
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${m}:${s}`;
    } else {
      clearInterval(payTimer);
    }
  }, 1000);

  if (simulatePaidBtn) {
    simulatePaidBtn.addEventListener('click', () => {
      clearInterval(payTimer);
      simulatePaidBtn.disabled = true;

      if (statusBox) {
        statusBox.className = 'payment-status-indicator success';
        statusText.innerHTML = `✓ ได้รับยอดชำระ <strong>฿${totalAmount}.00</strong> เรียบร้อยแล้ว! กำลังออกตั๋วเข้างาน...`;
      }

      order.status = 'PAID';
      saveOrder(order);

      setTimeout(() => {
        location.href = 'tickets.html';
      }, 1400);
    });
  }
}

// 5. Issued Tickets Pass (tickets-v4)
function initTicketsV4() {
  const order = getOrder();
  const holderNames = document.querySelectorAll('.ticket-holder-name');
  holderNames.forEach(el => {
    if (order.name) el.textContent = order.name;
  });

  const typeLabel = document.getElementById('ticket-type-label');
  if (typeLabel) {
    if (order.isStudent) {
      typeLabel.textContent = 'สิทธิ์นักศึกษา @ubu.ac.th (฿79)';
    } else {
      typeLabel.textContent = `บัตรเข้างานทั่วไป (General Admission) (฿${order.regularPrice || 150})`;
    }
  }
}

// 6. My Tickets Lookup (my-tickets.html - lookup-v1)
function initLookupV1() {
  const form = document.getElementById('lookup-form');
  const resultCard = document.getElementById('lookup-result-card');
  const sendMagicBtn = document.getElementById('send-magic-link-btn');
  const sentAlert = document.getElementById('magic-link-sent-alert');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (resultCard) {
        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  if (sendMagicBtn) {
    sendMagicBtn.addEventListener('click', () => {
      sendMagicBtn.disabled = true;
      sendMagicBtn.innerHTML = '<span>ส่ง Magic Link เรียบร้อยแล้ว ✓</span>';
      if (sentAlert) sentAlert.style.display = 'flex';
    });
  }
}

// 7. Gate Scanner Simulation (scanner.html - scanner-v4)
let currentScanMode = 'CHECK_IN';

function initScannerV4() {
  const inBtn = document.getElementById('mode-in-btn');
  const outBtn = document.getElementById('mode-out-btn');
  const manualSearchBtn = document.getElementById('manual-search-btn');

  if (inBtn && outBtn) {
    inBtn.addEventListener('click', () => {
      currentScanMode = 'CHECK_IN';
      inBtn.classList.add('active');
      outBtn.classList.remove('active');
    });

    outBtn.addEventListener('click', () => {
      currentScanMode = 'CHECK_OUT';
      outBtn.classList.add('active');
      inBtn.classList.remove('active');
    });
  }

  if (manualSearchBtn) {
    manualSearchBtn.addEventListener('click', () => {
      const input = document.getElementById('manual-ticket-input');
      if (input && input.value.trim()) {
        triggerScanModal('VALID');
      } else {
        alert('กรุณากรอกเลขที่บัตร');
      }
    });
  }
}

window.triggerScanModal = function(type) {
  const modal = document.getElementById('scan-popup-modal');
  const banner = document.getElementById('modal-status-banner');
  const title = document.getElementById('modal-status-title');
  const prevStatus = document.getElementById('modal-prev-status');

  if (!modal) return;

  if (type === 'VALID') {
    banner.className = 'modal-status-banner success';
    title.textContent = currentScanMode === 'CHECK_IN' ? '✓ บัตรถูกต้อง • ผ่านเข้างานได้ (CHECK-IN)' : '✓ บัตรถูกต้อง • สแกนออกชั่วคราว (CHECK-OUT)';
    prevStatus.textContent = currentScanMode === 'CHECK_IN' ? 'OUTSIDE → INSIDE' : 'INSIDE → OUTSIDE';
  } else if (type === 'DUPLICATE') {
    banner.className = 'modal-status-banner danger';
    title.textContent = '✕ ปฏิเสธ: บัตรอยู่ในงานแล้ว (ALREADY CHECKED IN)';
    prevStatus.textContent = 'INSIDE (สแกนเข้าซ้ำไม่ได้)';
  } else {
    banner.className = 'modal-status-banner danger';
    title.textContent = '✕ ปฏิเสธ: ไม่พบบัตรในระบบ (INVALID TICKET)';
    prevStatus.textContent = 'ไม่พบข้อมูลในฐานข้อมูล';
  }

  modal.style.display = 'flex';
};

window.closeScanModal = function() {
  const modal = document.getElementById('scan-popup-modal');
  if (modal) modal.style.display = 'none';
};
