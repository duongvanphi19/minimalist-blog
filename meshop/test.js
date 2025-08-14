// Utility to safely get elements
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) console.error(`Element with ID ${id} not found`);
    return element;
}

// Security: Escape HTML to prevent XSS
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Format currency
function toCurrency(value) {
    return parseInt(value).toLocaleString('vi-VN');
}

// Cookie Consent
if (!localStorage.getItem('cookieConsent')) {
    safeGetElement('cookieConsent').style.display = 'flex';
}
safeGetElement('acceptCookies')?.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'accepted');
    safeGetElement('cookieConsent').style.display = 'none';
});
safeGetElement('rejectCookies')?.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'rejected');
    safeGetElement('cookieConsent').style.display = 'none';
});

// Modal
function openModal(modalId) {
    const modal = safeGetElement(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.querySelector('.close')?.focus();
    }
}
document.querySelectorAll('.close').forEach(close => close.onclick = () => close.parentElement.parentElement.style.display = 'none');

// Flower and Theme Options
const flowerImages = [
    { src: 'assets/uploads/transparent.png', alt: 'Không decor', style: 'background: #fff;' },
    { src: 'assets/uploads/flower1.png', alt: 'Hoa 1' },
    { src: 'assets/uploads/flower2.png', alt: 'Hoa 2' },
    { src: 'assets/uploads/flower3.png', alt: 'Hoa 3' },
    { src: 'assets/uploads/flower4.png', alt: 'Hoa 4' },
    { src: 'assets/uploads/flower5.png', alt: 'Hoa 5' },
    { src: 'assets/uploads/flower6.png', alt: 'Hoa 6' },
    { src: 'assets/uploads/flower7.png', alt: 'Hoa 7' }
];
const themes = [
    { id: 'theme-0', gradient: 'linear-gradient(#fff, #eee)' },
    { id: 'theme-1', gradient: 'linear-gradient(#fff, #f6efe6)' },
    { id: 'theme-2', gradient: 'linear-gradient(#fffaf7, #e7f6f3)' },
    { id: 'theme-3', gradient: 'linear-gradient(#fff, #eef5ff)' },
    { id: 'theme-4', gradient: 'linear-gradient(#fff, #fff1f4)' },
    { id: 'theme-5', gradient: 'linear-gradient(#fff, #ffc107)' },
    { id: 'theme-6', gradient: 'linear-gradient(#fff, #7eb8f3)' },
    { id: 'theme-7', gradient: 'linear-gradient(#fff, #ba68c8)' },
    { id: 'theme-8', gradient: 'linear-gradient(#fff, #da6d51)' }
];
safeGetElement('flowerSelect').innerHTML = flowerImages.map(img => `
    <img class="predefined-flower-img" src="${img.src}" data-image="${img.src}" style="width: 50px; height: 50px; cursor: pointer; border: 2px solid transparent; border-radius: 4px; ${img.style || ''}" loading="lazy" alt="${img.alt}">
`).join('');
safeGetElement('themeSelect').innerHTML = themes.map(theme => `
    <div class="swatch theme-btn" data-theme="${theme.id}" style="width: 34px; height: 24px; background: ${theme.gradient}; border-radius: 6px;" aria-label="Theme ${theme.id}"></div>
`).join('');

// Upload Feedback
function updateIndicator(id, status, message) {
    const indicator = safeGetElement(id);
    if (indicator) {
        indicator.className = `upload-indicator ${status}`;
        indicator.textContent = message;
    }
}
['shopLogo', 'flowerImage', 'qrImage'].forEach(id => {
    safeGetElement(id)?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        updateIndicator(`${id}Indicator`, 'loading', 'Đang tải...');
        if (file && file.size > 2 * 1024 * 1024) {
            updateIndicator(`${id}Indicator`, 'error', 'File quá lớn (>2MB)!');
        } else {
            setTimeout(() => updateIndicator(`${id}Indicator`, 'success', 'Đã tải file!'), 500);
            if (id === 'shopLogo') {
                safeGetElement('outLogo').src = file ? URL.createObjectURL(file) : '';
                safeGetElement('outLogo').style.display = file ? 'block' : 'none';
            }
            if (id === 'flowerImage') {
                const src = file ? URL.createObjectURL(file) : '';
                safeGetElement('flowerTL').src = src;
                safeGetElement('flowerBR').src = src;
                safeGetElement('flowerTL').style.display = src ? 'block' : 'none';
                safeGetElement('flowerBR').style.display = src ? 'block' : 'none';
            }
            if (id === 'qrImage') {
                safeGetElement('outQr').src = file ? URL.createObjectURL(file) : '';
                safeGetElement('outQr').style.display = file ? 'block' : 'none';
            }
        }
    });
});

// Form Validation
safeGetElement('invoiceForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = safeGetElement('customerPhone').value;
    if (phone && !/^\d{10,11}$/.test(phone)) {
        alert('SĐT phải có 10-11 số!');
        safeGetElement('customerPhone').focus();
        return false;
    }
    return true;
});

// Form Handling
let products = [];
function addProduct() {
    products.push({ name: '', qty: 1, price: 0 });
    renderProducts();
}
function renderProducts() {
    const productList = safeGetElement('productList');
    if (productList) {
        productList.innerHTML = products.map((p, i) => `
            <div class="row" style="margin-top: 6px">
                <div class="col">
                    <input type="text" placeholder="Tên SP" value="${p.name}" onchange="products[${i}].name = this.value; updatePreview()" aria-label="Tên sản phẩm">
                </div>
                <div class="col">
                    <input type="number" placeholder="SL" value="${p.qty}" min="1" onchange="products[${i}].qty = this.value; updatePreview()" aria-label="Số lượng">
                </div>
                <div class="col">
                    <input type="number" placeholder="Đơn giá (VNĐ)" value="${p.price}" min="0" onchange="products[${i}].price = this.value; updatePreview()" aria-label="Đơn giá">
                </div>
                <button class="btn warn" onclick="products.splice(${i}, 1); renderProducts();" aria-label="Xóa sản phẩm">X</button>
            </div>
        `).join('');
    }
    updatePreview();
}
safeGetElement('addProductBtn')?.addEventListener('click', addProduct);
safeGetElement('clearProducts')?.addEventListener('click', () => {
    products = [];
    renderProducts();
});

// Preview Update
function updatePreview() {
    const fields = ['shopName', 'customerName', 'customerPhone', 'customerAddress', 'orderId', 'orderDate', 'expectedDate', 'paymentMethod', 'shippingFee', 'paidAmount', 'shortNote', 'thankYouText'];
    fields.forEach(id => {
        const element = safeGetElement(`out${id.charAt(0).toUpperCase() + id.slice(1)}`);
        if (element) element.textContent = safeGetElement(id)?.value || '';
    });

    const outProducts = safeGetElement('outProducts');
    if (outProducts) {
        outProducts.innerHTML = '';
        let total = 0;
        if (products.length === 0) {
            outProducts.innerHTML = '<div style="text-align:center;color:var(--muted);padding:8px">Không có sản phẩm</div>';
        } else {
            const frag = document.createDocumentFragment();
            const headerRow = document.createElement('div');
            headerRow.className = 'callout prod-row';
            headerRow.style = 'color: var(--accent)';
            headerRow.innerHTML = `<div style="flex:1">Sản phẩm</div><div style="width:20px;text-align:right">SL</div><div style="width:70px;text-align:right">Đơn giá</div><div style="width:70px;text-align:right">Thành tiền</div>`;
            frag.appendChild(headerRow);
            products.forEach(p => {
                const subtotal = (p.qty || 0) * (p.price || 0);
                total += subtotal;
                const row = document.createElement('div');
                row.className = 'prod-row';
                row.innerHTML = `<div style="flex:1">${escapeHtml(p.name)}</div><div style="width:20px;text-align:right">${p.qty}</div><div style="width:70px;text-align:right">${toCurrency(p.price)} ₫</div><div style="width:70px;text-align:right">${toCurrency(subtotal)} ₫</div>`;
                frag.appendChild(row);
            });
            outProducts.appendChild(frag);
        }
        const shippingFee = parseInt(safeGetElement('shippingFee')?.value) || 0;
        safeGetElement('outTotal').textContent = `${toCurrency(total + shippingFee)} ₫`;
    }
}
document.querySelectorAll('#invoiceForm input, #invoiceForm select, #invoiceForm textarea').forEach(el => el.addEventListener('input', updatePreview));

// Theme Selection
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.body.className = btn.dataset.theme;
    });
});

// Flower Selection
document.querySelectorAll('.predefined-flower-img').forEach(img => {
    img.addEventListener('click', () => {
        safeGetElement('flowerTL').src = img.src;
        safeGetElement('flowerBR').src = img.src;
        safeGetElement('flowerTL').style.display = 'block';
        safeGetElement('flowerBR').style.display = 'block';
    });
});

// History Management
function renderHistory() {
    const history = JSON.parse(localStorage.getItem('invoices') || '[]').slice(0, 10);
    const historyList = safeGetElement('history-list');
    if (historyList) {
        historyList.innerHTML = history.map((inv, i) => `
            <li>${inv.shopName || 'Shop'} - ${inv.customerName || 'Khách'} - ${inv.orderDate || 'N/A'} <button class="btn" onclick="loadInvoice(${i})" aria-label="Tải hóa đơn">Tải</button></li>
        `).join('');
    }
}
function saveToHistory() {
    const invoice = {
        shopName: safeGetElement('shopName')?.value,
        customerName: safeGetElement('customerName')?.value,
        orderDate: safeGetElement('orderDate')?.value,
        products: products.map(p => ({ name: p.name, qty: p.qty, price: p.price }))
    };
    const history = JSON.parse(localStorage.getItem('invoices') || '[]');
    history.unshift(invoice);
    localStorage.setItem('invoices', JSON.stringify(history.slice(0, 10)));
    renderHistory();
}
function loadInvoice(index) {
    const history = JSON.parse(localStorage.getItem('invoices') || '[]');
    const invoice = history[index];
    if (invoice) {
        safeGetElement('shopName').value = invoice.shopName || '';
        safeGetElement('customerName').value = invoice.customerName || '';
        safeGetElement('orderDate').value = invoice.orderDate || '';
        products = invoice.products || [];
        renderProducts();
        updatePreview();
    }
}
safeGetElement('saveToHistoryBtn')?.addEventListener('click', saveToHistory);
safeGetElement('clearHistoryBtn')?.addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử hóa đơn?')) {
        localStorage.removeItem('invoices');
        renderHistory();
        alert('Đã xóa lịch sử thành công!');
    }
});

// Save Form
safeGetElement('saveBtn')?.addEventListener('click', async () => {
    const saveBtn = safeGetElement('saveBtn');
    if (!saveBtn) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang lưu...';
    try {
        if (safeGetElement('adminConsent').checked) {
            // Placeholder for EmailJS
            // await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', { /* data */ });
        }
        saveBtn.textContent = 'Lưu thành công!';
        setTimeout(() => saveBtn.textContent = 'Lưu tùy chọn', 2000);
    } catch (error) {
        saveBtn.textContent = 'Lỗi khi lưu!';
        console.error('Save error:', error);
        setTimeout(() => saveBtn.textContent = 'Lưu tùy chọn', 2000);
    } finally {
        saveBtn.disabled = false;
    }
});

// Reset Form
safeGetElement('resetBtn')?.addEventListener('click', () => {
    safeGetElement('invoiceForm').reset();
    products = [];
    safeGetElement('outLogo').style.display = 'none';
    safeGetElement('flowerTL').style.display = 'none';
    safeGetElement('flowerBR').style.display = 'none';
    safeGetElement('outQr').style.display = 'none';
    renderProducts();
});

// Download PNG
safeGetElement('downloadBtn')?.addEventListener('click', async () => {
    const card = safeGetElement('card');
    if (card && html2canvas) {
        const canvas = await html2canvas(card);
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'invoice.png';
        link.click();
    }
});

// Download PDF
safeGetElement('downloadPdf')?.addEventListener('click', async () => {
    const card = safeGetElement('card');
    if (card && window.jsPDF) {
        const canvas = await html2canvas(card);
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jsPDF;
        const pdf = new jsPDF();
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
        pdf.save('invoice.pdf');
    }
});

// Share Image
safeGetElement('shareBtn')?.addEventListener('click', async () => {
    const card = safeGetElement('card');
    if (card && navigator.share && html2canvas) {
        const canvas = await html2canvas(card);
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        const file = new File([blob], 'invoice.png', { type: 'image/png' });
        navigator.share({
            files: [file],
            title: 'Hóa đơn từ ' + safeGetElement('shopName')?.value,
            text: 'Xem hóa đơn chi tiết.'
        });
    }
});

// Initial Render
renderProducts();
renderHistory();