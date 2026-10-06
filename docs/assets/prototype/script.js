// UI simulation only. No payment, email, camera, R2, auth, or production API calls.
const DEMO_KEY = 'ticketbox-prototype-v2-order';
const EVENTS = {
  summer: { name:'Summer Live Concert', price:399, available:173, date:'วันเสาร์ที่ 24 ตุลาคม 2026', time:'18:00 น.', venue:'The Riverfront Warehouse (เจริญกรุง)', poster:'poster-summer.svg' },
  indie: { name:'Indie Night Underground', price:250, available:42, date:'วันศุกร์ที่ 6 พฤศจิกายน 2026', time:'19:30 น.', venue:'The Basement Club, ทองหล่อ', poster:'poster-indie.svg' }
};
const money = value => Number(value).toLocaleString('en-US', {maximumFractionDigits:2}) + ' THB';
const readOrder = () => { try { return JSON.parse(sessionStorage.getItem(DEMO_KEY)); } catch { return null; } };
const saveOrder = order => sessionStorage.setItem(DEMO_KEY, JSON.stringify(order));
const seedOrder = () => ({event:'summer', quantity:3, name:'John Doe', email:'john@example.com', phone:'081-234-5678', expiresAt:Date.now()+900000, status:'PENDING_PAYMENT'});
function showMessage(id, text) { const el=document.getElementById(id); if(el) { el.textContent=text; el.hidden=!text; } }
function statusBadge(el, status) { if(!el)return; el.className='badge '+(status==='PAID'?'badge-success':['EXPIRED','REJECTED'].includes(status)?'badge-danger':'badge-pending'); el.textContent=(status==='PAID'?'✓ ':['EXPIRED','REJECTED'].includes(status)?'✕ ':'◷ ')+status; }
document.addEventListener('DOMContentLoaded', () => { initTicketCalculator(); initSlipUploadPreview(); initAdminVerification(); initScannerSimulator(); initTicketView(); });

function initTicketCalculator() {
 const form=document.getElementById('guest-order-form'); if(!form)return;
 const key=new URLSearchParams(location.search).get('event')==='indie'?'indie':'summer'; const event=EVENTS[key];
 document.getElementById('event-name').textContent=event.name;
 document.getElementById('event-poster').src=event.poster;
 document.getElementById('event-poster').alt='ภาพโปสเตอร์ตัวอย่าง '+event.name;
 document.getElementById('event-date').textContent=event.date;
 document.getElementById('event-time').textContent=event.time;
 document.getElementById('event-venue').textContent=event.venue;
 document.title=event.name+' — TICKETBOX';
 const quantity=document.getElementById('ticket-quantity'); quantity.max=event.available; quantity.dataset.price=event.price;
 document.getElementById('availability-note').textContent=`เหลือ ${event.available} ใบ • จำนวนต้องไม่เกินบัตรที่มี`;
 if(key==='indie') { const lead=document.querySelector('.event-layout .lead'); lead.textContent='พบวงร็อกและอินดี้หน้าใหม่ในคลับใต้ดินใจกลางทองหล่อ'; }
 const update=()=>{ const total=event.price*Number(quantity.value); document.getElementById('subtotal-display').textContent=money(total); document.getElementById('total-display').textContent=money(total); };
 quantity.addEventListener('input',update); update();
 form.addEventListener('submit', e=>{ e.preventDefault(); if(!form.reportValidity())return;
  const order={event:key,quantity:Number(quantity.value),name:document.getElementById('cust-name').value.trim(),email:document.getElementById('cust-email').value.trim(),phone:document.getElementById('cust-phone').value.trim(),expiresAt:Date.now()+900000,status:'PENDING_PAYMENT'};
  if(!order.name||!order.email||!order.phone){showMessage('order-form-error','กรุณากรอกข้อมูลผู้ซื้อให้ครบ');return;}
  saveOrder(order); location.href='checkout.html';
 });
}
function initSlipUploadPreview() {
 const input=document.getElementById('slip-file-input'); if(!input)return;
 let order=readOrder()||seedOrder(); saveOrder(order);
 const button=document.getElementById('submit-slip-btn'), notice=document.getElementById('upload-success-notice'), preview=document.getElementById('slip-preview-container'), img=document.getElementById('slip-preview-img');
 let selected=null, busy=false;
 const event=EVENTS[order.event]||EVENTS.summer;
 const heading=document.querySelector('.order-heading p'); heading.textContent=`ผู้สั่งซื้อ: ${order.name} (${order.email}, ${order.phone})`;
 const summary=document.querySelector('.checkout-content h3'); const summaryBody=summary.parentElement; summaryBody.querySelector('div span').textContent=`${event.name} • บัตรทั่วไป (× ${order.quantity} ใบ)`;
 summaryBody.querySelectorAll('div span').forEach((span,index)=>{if(index===1||index===3)span.textContent=money(event.price*order.quantity);});
 document.querySelector('.payment-grid > div:last-child > div:last-child strong').textContent=money(event.price*order.quantity);
 function render() {
  order=readOrder()||order;
  if(order.status==='PENDING_PAYMENT'&&Date.now()>=order.expiresAt){order.status='EXPIRED';saveOrder(order);}
  statusBadge(document.getElementById('order-status-badge'),order.status);
  const pending=order.status==='PENDING_PAYMENT';
  const seconds=Math.max(0,Math.ceil((order.expiresAt-Date.now())/1000));
  document.getElementById('reservation-timer').textContent=pending?`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:'จบช่วงรอชำระเงิน';
  document.getElementById('timer-banner').hidden=!pending;
  document.getElementById('order-expired-msg').style.display=order.status==='EXPIRED'?'block':'none';
  input.disabled=!pending||busy; button.disabled=!pending||busy; button.hidden=!pending;
  notice.style.display=['WAITING_FOR_VERIFY','PAID','REJECTED'].includes(order.status)?'block':'none';
  notice.className='order-notice notice-'+(order.status==='PAID'?'success':order.status==='REJECTED'?'danger':'pending');
  notice.querySelector('h3').textContent=order.status==='PAID'?'✓ ชำระเงินผ่านการตรวจสอบแล้ว':order.status==='REJECTED'?'✕ สลิปไม่ผ่านการตรวจสอบ':'◷ รับสลิปแล้ว • รอแอดมินตรวจสอบ';
  if(order.status==='WAITING_FOR_VERIFY')notice.querySelector('p').textContent='เก็บบัตรไว้ระหว่างรอตรวจสอบ และจะส่งลิงก์บัตรทางอีเมลเมื่อผ่านการตรวจสอบ';
  if(order.status==='PAID')notice.querySelector('p').textContent='✓ ชำระเงินผ่านการตรวจสอบแล้ว เปิดบัตรด้วยลิงก์ที่ส่งทางอีเมล';
  if(order.status==='REJECTED')notice.querySelector('p').textContent='✕ สลิปไม่ผ่านการตรวจสอบ ระบบจำลองส่งอีเมลแจ้งผลให้ผู้ซื้อ';
 }
 render(); setInterval(render,1000);
 input.addEventListener('change',()=>{
  selected=null; preview.style.display='none'; showMessage('upload-error','');
  const file=input.files[0]; if(!file)return;
  if(!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024){showMessage('upload-error','✕ เลือกเฉพาะไฟล์ JPEG หรือ PNG ขนาดไม่เกิน 5 MB');input.value='';return;}
  selected=file;const reader=new FileReader();reader.onload=()=>{img.src=reader.result;preview.style.display='block';};reader.readAsDataURL(file);
 });
 button.addEventListener('click',()=>{
  render();if(order.status!=='PENDING_PAYMENT'||busy)return;
  if(!selected){showMessage('upload-error','✕ กรุณาเลือกไฟล์สลิปก่อนส่ง');return;}
  busy=true;button.disabled=true;button.textContent='กำลังส่งสลิป (จำลอง)…';
  setTimeout(()=>{order=readOrder()||order;busy=false;if(Date.now()>=order.expiresAt){render();return;}order.status='WAITING_FOR_VERIFY';saveOrder(order);showMessage('upload-error','');render();},600);
 });
 document.getElementById('demo-expire').addEventListener('click',()=>{if(order.status!=='PENDING_PAYMENT'){showMessage('upload-error','ช่วงจองจบแล้ว — การจำลองหมดเวลาไม่เปลี่ยนรายการที่รอตรวจ');return;}order.expiresAt=Date.now()-1;saveOrder(order);render();});
 document.getElementById('demo-reset-order').addEventListener('click',()=>{saveOrder(seedOrder());location.reload();});
}
function initAdminVerification() {
 const approve=document.getElementById('approve-order-btn'); if(!approve)return;
 const reject=document.getElementById('reject-order-btn'),resend=document.getElementById('resend-email-btn'),badge=document.getElementById('admin-status'),result=document.getElementById('admin-result');
 const demoOrder=readOrder()||{...seedOrder(),status:'WAITING_FOR_VERIFY'}, demoEvent=EVENTS[demoOrder.event]||EVENTS.summer;
 const reviewValues=document.querySelectorAll('.review-details dd');
 reviewValues[0].textContent=demoEvent.name;reviewValues[1].textContent=demoOrder.name+' • '+demoOrder.email;reviewValues[2].textContent=demoOrder.quantity+' ใบ × '+money(demoEvent.price);reviewValues[3].textContent=money(demoOrder.quantity*demoEvent.price);
 document.querySelector('.slip-amount').textContent=money(demoOrder.quantity*demoEvent.price);
 document.querySelector('.slip-sample dd').textContent=demoOrder.name+' · XXX-X-XX001-X';
 let state=demoOrder.status;
 const reset=document.getElementById('reset-review');
 const lock=()=>{approve.disabled=true;reject.disabled=true;};
 statusBadge(badge,state);
 if(state!=='WAITING_FOR_VERIFY'){lock();result.textContent=state==='PAID'?`✓ PAID • ออกบัตรแล้ว ${demoOrder.quantity} ใบ`:state==='REJECTED'?'✕ REJECTED • ไม่ออกบัตร':state==='EXPIRED'?'✕ EXPIRED • รายการหมดเวลา ไม่สามารถอนุมัติได้':'◷ รอผู้ซื้อแนบสลิป • ยังไม่พร้อมตรวจสอบ';}
 if(state==='PAID'&&demoOrder.emailDelivery==='FAILED'){result.textContent=`◷ PAID • ออกบัตรแล้ว ${demoOrder.quantity} ใบ แต่อีเมลส่งไม่สำเร็จ`;resend.hidden=false;}
 window.approveOrder=()=>{
  if(state!=='WAITING_FOR_VERIFY')return;lock();reset.disabled=true;result.textContent='กำลังตรวจและเตรียมบัตร (จำลอง)…';
  const scenario=document.getElementById('approval-scenario').value;
  setTimeout(()=>{
   reset.disabled=false;
   if(scenario==='issuance-failure'){result.textContent='✕ เตรียม QR / ออกบัตรไม่สำเร็จ — ยังคง WAITING_FOR_VERIFY ลอง Approve ใหม่ได้โดยไม่ออกบัตรซ้ำ';approve.disabled=false;reject.disabled=false;return;}
   state='PAID';statusBadge(badge,state);demoOrder.status='PAID';demoOrder.emailDelivery=scenario==='email-failure'?'FAILED':'SENT';saveOrder(demoOrder);
   if(scenario==='email-failure'){result.textContent=`◷ PAID • ออกบัตรแล้ว ${demoOrder.quantity} ใบ แต่อีเมลส่งไม่สำเร็จ`;resend.hidden=false;}
   else result.textContent=`✓ PAID • ออกบัตร ${demoOrder.quantity} ใบ และส่งอีเมลบัตรสำเร็จ (จำลอง)`;
  },500);
 };
 window.rejectOrder=()=>{if(state!=='WAITING_FOR_VERIFY')return;state='REJECTED';lock();statusBadge(badge,state);result.textContent='✕ REJECTED • ไม่ออกบัตร และส่งอีเมลแจ้งผลไม่ผ่านการตรวจสอบ (จำลอง)';demoOrder.status=state;saveOrder(demoOrder);};
 window.resendEmail=()=>{resend.disabled=true;reset.disabled=true;result.textContent='กำลังส่งอีเมลบัตรเดิมอีกครั้ง (จำลอง)…';setTimeout(()=>{result.textContent='✓ PAID • ส่งอีเมลสำเร็จ ใช้บัตรและ QR เดิม ไม่ออกบัตรเพิ่ม (จำลอง)';demoOrder.emailDelivery='SENT';saveOrder(demoOrder);resend.hidden=true;resend.disabled=false;reset.disabled=false;},500);};
 document.getElementById('reset-review').addEventListener('click',()=>{state='WAITING_FOR_VERIFY';demoOrder.status=state;delete demoOrder.emailDelivery;saveOrder(demoOrder);statusBadge(badge,state);approve.disabled=false;reject.disabled=false;resend.hidden=true;result.textContent='รอการตรวจสอบ • ยังไม่มีบัตรที่ออกจากการตัดสินใจนี้';});
}
function initScannerSimulator() {
 const panel=document.getElementById('scan-result-panel');if(!panel)return;
 const mode=document.getElementById('scan-action'),body=document.getElementById('scan-result-body'),title=document.getElementById('scan-result-title'),log=document.getElementById('scan-log-tbody');
 const tickets={ 'TKT-00125-01':{status:'OUTSIDE',event:'EVT-01',paid:true}, 'TKT-00125-02':{status:'INSIDE',event:'EVT-01',paid:true}, 'TKT-00125-03':{status:'CANCELLED',event:'EVT-01',paid:true}, 'WRONG_EVENT':{status:'OUTSIDE',event:'EVT-02',paid:true}, 'UNPAID':{status:'OUTSIDE',event:'EVT-01',paid:false} };
 let awaiting=false;
 window.simulateScan=key=>{
  if(awaiting)return;awaiting=true;mode.disabled=true;document.querySelectorAll('[data-scan-simulation]').forEach(b=>b.disabled=true);
  const ticket=tickets[key],action=mode.value;let message='',heading='',tone='danger',outcome='INVALID';
  if(!ticket){heading='✕ INVALID TICKET';message='ไม่พบ QR ในรายการบัตร • ไม่เปลี่ยนสถานะ';}
  else if(ticket.event!=='EVT-01'){heading='✕ WRONG EVENT';message='บัตรไม่ใช่ของ Summer Live Concert • ปฏิเสธการเข้า';outcome='WRONG_EVENT';}
  else if(!ticket.paid){heading='✕ INVALID TICKET';message='คำสั่งซื้อยังไม่เป็น PAID • ปฏิเสธการเข้า';outcome='UNPAID';}
  else if(ticket.status==='CANCELLED'){heading='✕ INVALID TICKET';message=`${key} ถูกยกเลิก • ปฏิเสธการเข้า`;outcome='CANCELLED';}
  else if(action==='CHECK_IN'&&ticket.status==='INSIDE'){heading='! ALREADY CHECKED IN';message=`${key} อยู่ INSIDE แล้ว • ไม่เปลี่ยนสถานะ`;tone='pending';outcome='ALREADY_INSIDE';}
  else if(action==='CHECK_OUT'&&ticket.status==='OUTSIDE'){heading='! CANNOT CHECK OUT';message=`${key} ยังอยู่ OUTSIDE • ไม่เปลี่ยนสถานะ`;tone='pending';outcome='INVALID_ACTION';}
  else {ticket.status=action==='CHECK_IN'?'INSIDE':'OUTSIDE';heading=action==='CHECK_IN'?'✓ VALID TICKET':'✓ CHECKED OUT';message=`${key} • Summer Live Concert • ${ticket.status}`;tone='success';outcome='PASS';}
  title.textContent=heading;body.textContent=message;panel.className='scan-result bg-'+tone;panel.hidden=false;
  document.getElementById('scan-log-empty')?.remove();const row=document.createElement('tr');
  [new Date().toLocaleTimeString('th-TH'),ticket?key:'— ไม่พบบัตร',action,outcome,'Organizer #01','EVT-01'].forEach(text=>{const cell=document.createElement('td');cell.textContent=text;row.append(cell);});log.prepend(row);
  document.getElementById('next-scan-btn').focus({preventScroll:true});panel.scrollIntoView({block:'nearest',behavior:'auto'});
 };
 window.closeModal=()=>{awaiting=false;panel.hidden=true;mode.disabled=false;document.querySelectorAll('[data-scan-simulation]').forEach(b=>b.disabled=false);document.querySelector('[data-scan-simulation]').focus({preventScroll:true});};
}
function initTicketView() {
 if(document.body.dataset.prototypePage!=='tickets')return;
 const order=readOrder();if(!order)return;const container=document.querySelector('.ticket-container'),header=document.querySelector('.ticket-container').previousElementSibling;
 if(order.status!=='PAID'){container.hidden=true;statusBadge(header.querySelector('.badge'),order.status);header.querySelector('.badge').textContent='◷ ยังไม่มีบัตรที่ออกแล้ว';header.querySelector('h1').textContent='รอผลการตรวจสอบการชำระเงิน';header.querySelector('p').textContent='ตัวอย่าง Order นี้ยังไม่ได้รับอนุมัติ จึงไม่แสดง QR บัตร';return;}
 const event=EVENTS[order.event]||EVENTS.summer;header.querySelector('p').textContent=`Order #ORD-00125 • ${order.name} (${order.email}) • ${order.quantity} ใบ`;
 const templates=Array.from(container.children).map(card=>card.cloneNode(true));container.replaceChildren();
 for(let i=1;i<=order.quantity;i++){const card=templates[(i-1)%templates.length].cloneNode(true);card.querySelector('.badge').textContent=`TICKET ${i} OF ${order.quantity}`;card.querySelector('h2').textContent=event.name;card.querySelector('.ticket-details > p').textContent=event.venue;card.querySelector('.ticket-details > div:last-child').textContent=`เลขที่บัตร: TKT-00125-${String(i).padStart(2,'0')}`;card.querySelector('.ticket-qr small').textContent=`QR ตัวอย่าง · ใบที่ ${i}`;const details=card.querySelectorAll('.ticket-details > div')[1].querySelectorAll('span');details[0].textContent=event.date;details[1].textContent=event.time;details[2].textContent='บัตรทั่วไป • '+money(event.price);container.append(card);}
}
