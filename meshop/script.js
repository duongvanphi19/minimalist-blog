// Mobile-first invoice generator
// - fills preview from form inputs
// - allows floral image upload (top-left & bottom-right auto placement)
// - exports PNG using html2canvas at high resolution (1080x1500)

/* Elements */
const el = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  const orderId    = el('orderId');
  const orderDate  = el('orderDate');
  const customer   = el('customerName');
  const phone      = el('phone');
  const address    = el('address');
  const productList= el('productList');
  const total      = el('total');
  const payment    = el('payment');
  const footerNote = el('footerNote');

  const floralUpload = el('floralUpload');
  const floralTL = el('floralTopLeft');
  const floralBR = el('floralBottomRight');

  const applyBtn = el('applyBtn');
  const downloadPng = el('downloadPng');

  // preview elements
  const pOrderId = el('pOrderId');
  const pOrderDate = el('pOrderDate');
  const pCustomer = el('pCustomer');
  const pPhone = el('pPhone');
  const pAddress = el('pAddress');
  const pProducts = el('pProducts');
  const pTotal = el('pTotal');
  const pPayment = el('pPayment');
  const pFooter = el('pFooter');

  // set default date to today
  orderDate.valueAsDate = new Date();

  function applyData(){
    pOrderId.textContent = orderId.value.trim() || '#00123';
    // format date nicely
    const d = orderDate.value ? new Date(orderDate.value) : new Date();
    const opt = { year: 'numeric', month:'short', day:'numeric' };
    pOrderDate.textContent = d.toLocaleDateString('en-US', opt);
    pCustomer.textContent = customer.value.trim() || 'Nguyễn Văn A';
    pPhone.textContent = phone.value.trim() || '0912 345 678';
    pAddress.textContent = address.value.trim() || '123 Lê Lợi, Q1, HCM';

    // products: parse lines into rows
    const lines = productList.value.trim() ? productList.value.trim().split('\n') : [
      'B.Begin Non-Alcohol Perfume | 1 | 1,200,000₫',
      'Herbal Toothpaste | 1 | 150,000₫'
    ];
    // build HTML rows
    const rows = lines.map(line => {
      const parts = line.split('|').map(s => s.trim());
      const name = parts[0] || '';
      const qty = parts[1] || '';
      const price = parts[2] || '';
      return `<div class="prod-row"><div>${escapeHtml(name)}</div><div>${escapeHtml(qty)}</div><div class="right">${escapeHtml(price)}</div></div>`;
    }).join('');
    pProducts.innerHTML = rows;

    pTotal.textContent = total.value.trim() || '1,350,000₫';
    pPayment.textContent = payment.value.trim() || 'Bank Transfer';
    pFooter.textContent = footerNote.value.trim() || 'Cảm ơn anh/chị đã tin tưởng ủng hộ Diễm Thúy Shop 🌿';
  }

  applyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    applyData();
    applyBtn.textContent = 'Đã áp dụng ✓';
    setTimeout(()=> applyBtn.textContent = 'Áp dụng & Xem', 1200);
  });

  // handle floral upload: if user uploads one image, use it for both corners with transforms
  floralUpload.addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    if(!f) return;
    const url = URL.createObjectURL(f);
    floralTL.src = url;
    floralBR.src = url;
    floralTL.classList.remove('hidden');
    floralBR.classList.remove('hidden');
    // optionally flip bottom-right for variety
    floralBR.style.transform = 'scaleX(-1) translate(4%, 4%)';
  });

  // Helper: escape HTML (basic)
  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
  }

  // Export PNG: we want 1080x1500 result
  downloadPng.addEventListener('click', async () => {
    applyData();
    const invoiceCard = document.querySelector('#invoiceCard');

    // compute scale ratio from preview width (360px) to target width (1080px)
    const targetW = 1080;
    const targetH = 1500;
    const previewWidth = invoiceCard.clientWidth; // e.g., 360
    const scale = targetW / previewWidth; // 3

    // temporarily set inline style to target size for crisp rendering
    const origStyle = {
      width: invoiceCard.style.width,
      height: invoiceCard.style.height,
      transform: invoiceCard.style.transform
    };

    invoiceCard.style.width = targetW + 'px';
    invoiceCard.style.height = targetH + 'px';
    invoiceCard.style.transform = 'scale(1)'; // ensure no css scaling

    // html2canvas (use higher scale for clarity)
    const canvas = await html2canvas(invoiceCard, {
      scale: 1, useCORS: true, backgroundColor: null
    });

    // restore preview size
    invoiceCard.style.width = origStyle.width;
    invoiceCard.style.height = origStyle.height;
    invoiceCard.style.transform = origStyle.transform;

    // create download link
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `order_${(orderId.value.trim() || '00123')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // initial fill
  applyData();
});