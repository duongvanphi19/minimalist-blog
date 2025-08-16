/* ======== Helpers & Constants ======== */
const $ = (id) => document.getElementById(id);
const LS_FORM = "invoice_v3_form";
const LS_PRODUCTS = "invoice_v3_products";
const LS_THEME = "invoice_v3_theme";
const MAX_FILE_SIZE = 1024 * 1024;

// Hidden decor codes (keys are normalized WITHOUT leading '#')
const HIDDEN_DECOR_MAP = {
    vietnam: "assets/uploads/vietnam-national-day.webp",
    midautumn: "assets/uploads/mid-autumn-festival.webp",
    neko: "assets/uploads/maneki-neko.webp",
    valentine: "assets/uploads/valentine.webp",
    vulan: "assets/uploads/vulan.webp",
    halloween: "assets/uploads/halloween.webp",
    xmas: "assets/uploads/xmas.webp"
};

let originalFlowerImageSrc = null;

// Map month -> decor (keys are month numbers)
const MONTHLY_DECOR_MAP = {
    "14-2": "assets/uploads/valentine.webp", // Feb - Valentine
    8: "assets/uploads/vulan.webp", // Aug - Mid-Autumn
    9: "assets/uploads/vietnam-national-day.webp", // Sep - VN National Day
    12: "assets/uploads/xmas.webp" // Dec - Christmas
};

// IndexedDB setup
const DB_NAME = 'InvoiceV3DB';
const DB_VERSION = 1;
let db;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
}



function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('images')) {
                db.createObjectStore('images', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('history')) {
                db.createObjectStore('history', { keyPath: 'timestamp' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

const iosModal = document.getElementById('iosInstallModal');
const closeBtns = document.querySelectorAll('.close');

if (isIOS() && !isInStandaloneMode()) {
    iosModal.style.display = 'block';
}

closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        iosModal.style.display = 'none';
    });
});

function setMonthlyDecor() {
    try {
        const currentMonth = new Date().getMonth() + 1; // 1..12
        const monthlyImagePath = MONTHLY_DECOR_MAP[currentMonth];
        if (monthlyImagePath) {
            document.documentElement.style.setProperty("--flower-image", `url(${monthlyImagePath})`);
        } else {
            document.documentElement.style.setProperty("--flower-image", "none");
        }
    } catch (e) {
        console.warn("setMonthlyDecor failed", e);
    }
}

/* ======== Decor code input (orderId) ======== */
if (document && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", () => {
        const orderEl = $("orderId");
        if (orderEl) {
            orderEl.addEventListener("input", async (e) => {
                const raw = e.target.value.trim().toLowerCase();
                const key = raw.replace(/^#/, "");

                if (!key) return;

                if (key === "reset") {
                    await setDecorImageFromPath(originalFlowerImageSrc || "");
                    return;
                }

                const hiddenImagePath = HIDDEN_DECOR_MAP[key];
                if (hiddenImagePath) {
                    await setDecorImageFromPath(hiddenImagePath);
                    return;
                }

                const transaction = db.transaction(['images'], 'readonly');
                const store = transaction.objectStore('images');
                const request = store.get('flowerImg');
                request.onsuccess = () => {
                    const imgs = request.result ? { flowerImg: request.result.data } : {};
                    if (Object.values(HIDDEN_DECOR_MAP).includes(imgs.flowerImg)) {
                        setDecorImageFromPath(originalFlowerImageSrc || "");
                    }
                };
            });
        }
    });
}

async function setDecorImageFromPath(path) {
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');
    store.put({ key: 'flowerImg', data: path });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            console.log(`Set flowerImg to: ${path}`); // Debug
            if ($('flowerTL')) {
                $('flowerTL').src = path;
                $('flowerTL').style.display = path ? 'block' : 'none';
            }
            if ($('flowerBR')) {
                $('flowerBR').src = path;
                $('flowerBR').style.display = path ? 'block' : 'none';
            }
            document.querySelectorAll('.predefined-flower-img').forEach((img) => {
                img.style.border = img.getAttribute('data-image') === path
                    ? '2px solid var(--accent)'
                    : '2px solid transparent';
            });
            resolve();
        };
        transaction.onerror = () => {
            console.error('Error setting decor image:', transaction.error);
            reject(transaction.error);
        };
    });
}

/* ======== Utilities ======== */
function toCurrency(n) {
    return (Number(n) || 0).toLocaleString("vi-VN");
}

function dataURLFromFile(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = (e) => res(e.target.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

function escapeHtml(s) {
    return String(s || "").replace(
        /[&<>\"']/g,
        (m) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[m]
    );
}

/* ======== History Functions ======== */
async function getFormData() {
    const formState = {};
    const ids = [
        "shopName", "customerName", "customerPhone", "customerAddress",
        "orderDate", "expectedDate", "orderId", "paidAmount",
        "paymentMethod", "shippingFee", "shortNote", "note", "thankYouText"
    ];
    ids.forEach((id) => {
        const el = $(id);
        if (el) formState[id] = el.value;
    });
    formState.products = getProducts();

    // Lấy images từ IndexedDB
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const images = request.result.reduce((acc, { key, data }) => {
                acc[key] = data;
                return acc;
            }, {});
            formState.images = images;
            formState.theme = localStorage.getItem(LS_THEME) || "theme-0";
            resolve(formState);
        };
        request.onerror = () => reject(request.error);
    });
}

async function loadFormData(data) {
    if (!data) return;
    const ids = [
        "shopName", "customerName", "customerPhone", "customerAddress",
        "orderDate", "expectedDate", "orderId", "paidAmount",
        "paymentMethod", "shippingFee", "shortNote", "note", "thankYouText"
    ];
    ids.forEach((id) => {
        if ($(id) && data[id] !== undefined) $(id).value = data[id];
    });

    if (data.products) {
        $("productList").innerHTML = "";
        data.products.forEach((p) => addProduct(p));
    }

    if (data.images) {
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        Object.entries(data.images || {}).forEach(([key, value]) => {
            store.put({ key, data: value });
        });
        await loadImages();
    }

    if (data.theme) {
        setTheme(data.theme);
        document.querySelectorAll(".theme-btn").forEach((b) => {
            b.classList.toggle("selected", b.dataset.theme === data.theme);
        });
    }
    updateInvoice();
}

async function saveInvoiceToHistory() {
    const invoiceData = await getFormData();
    invoiceData.timestamp = Date.now();

    const transaction = db.transaction(['history'], 'readwrite');
    const store = transaction.objectStore('history');
    store.put(invoiceData);

    transaction.oncomplete = () => {
        renderHistory();
        alert('Đã lưu hóa đơn vào lịch sử.');
    };

    transaction.onerror = () => {
        alert('Lỗi khi lưu hóa đơn vào lịch sử.');
    };
}

async function renderHistory() {
    const transaction = db.transaction(['history'], 'readonly');
    const store = transaction.objectStore('history');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const history = request.result;
            const historyList = $('history-list');
            historyList.innerHTML = '';

            if (!history || history.length === 0) {
                historyList.innerHTML = `<p class="">Chưa có hóa đơn nào được lưu.</p>`;
                console.log('No history items found.');
                return resolve();
            }

            // Sắp xếp history theo timestamp giảm dần và lấy 10 mục mới nhất
            history.sort((a, b) => b.timestamp - a.timestamp);
            const limitedHistory = history.slice(0, 10);

            limitedHistory.forEach((inv) => {
                const li = document.createElement("li");
                li.classList.add(inv.theme || "theme-0");

                const thumbSrc = inv.images && inv.images.flowerImg ? escapeHtml(inv.images.flowerImg) : '';
                const thumbDisplay = thumbSrc ? 'block' : 'none';

                // Tính tổng giá trị hóa đơn
                const total = inv.products.reduce((sum, p) => sum + (p.qty * p.price), 0) + (Number(inv.shippingFee) || 0);

                console.log(`Rendering history item ${inv.timestamp}: thumbSrc=${thumbSrc}, total=${total}`); // Debug

                li.innerHTML = `
                    <img class="flower-thumbnail" src="${thumbSrc}" alt="Decor" style="display: ${thumbDisplay};">
                    <div class="invoice-details">
                        <span class="history-shop-name">${escapeHtml(inv.customerName || 'Đơn hàng')} - ${escapeHtml(inv.customerPhone || 'Không có SĐT')}</span>
                        <span class="history-date">${new Date(inv.timestamp).toLocaleString('vi-VN')}</span>
                        <strong  class="small history-total"> ${toCurrency(total)} ₫</strong>
                    </div>
                    <div class="invoice-actions">
                        <button class="load-btn" data-id="${inv.timestamp}">↶ Tải lại</button>
                        <button class="delete-btn" data-id="${inv.timestamp}">× Xóa</button>
                    </div>
                `;
                historyList.appendChild(li);
            });
            resolve();
        };

        request.onerror = () => {
            console.error('Error fetching history:', request.error);
            alert('Lỗi khi tải lịch sử hóa đơn.');
            reject(request.error);
        };
    });
}

async function loadInvoiceFromHistory(id) {
    const transaction = db.transaction(['history'], 'readonly');
    const store = transaction.objectStore('history');
    const request = store.get(Number(id));

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const invoiceToLoad = request.result;
            if (invoiceToLoad) {
                loadFormData(invoiceToLoad);
                alert(`Đã tải lại hóa đơn "${invoiceToLoad.shopName || 'Đơn hàng'}".`);
            }
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

async function deleteInvoiceFromHistory(id) {
    if (!confirm('Bạn có muốn xóa hóa đơn này không?')) return;

    const transaction = db.transaction(['history'], 'readwrite');
    const store = transaction.objectStore('history');
    store.delete(Number(id));

    transaction.oncomplete = () => {
        renderHistory();
        alert('Đã xóa hóa đơn khỏi lịch sử.');
    };

    transaction.onerror = () => {
        alert('Lỗi khi xóa hóa đơn.');
    };
}

async function clearHistory() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử hóa đơn?')) return;

    const transaction = db.transaction(['history'], 'readwrite');
    const store = transaction.objectStore('history');
    store.clear();

    transaction.oncomplete = () => {
        renderHistory();
        alert('Đã xóa toàn bộ lịch sử.');
    };

    transaction.onerror = () => {
        alert('Lỗi khi xóa lịch sử.');
    };
}

/* ======== Products ======== */
function createProductElement(p = {}) {
    const el = document.createElement("div");
    el.className = "product-item";
    el.innerHTML = `
        <input class="productName" placeholder="Tên sản phẩm" value="${escapeHtml(p.name || "")}">
        <input style="min-width: 10px;" class="productQty" placeholder="SL" type="number" min="1" max="999" maxlenght="3" value="${p.qty || ""}">
        <input class="productPrice" placeholder="Giá (VNĐ)" type="number" min="1" value="${p.price || ""}">
        <button class="remove-btn" title="Xóa">×</button>
    `;
    el.querySelector(".remove-btn").addEventListener("click", () => {
        el.remove();
        debouncedUpdateInvoice();
    });
    el.querySelectorAll("input").forEach((i) => i.addEventListener("input", debouncedUpdateInvoice));
    return el;
}

function addProduct(p) {
    $("productList").appendChild(createProductElement(p || {}));
    debouncedUpdateInvoice();
}

function clearProducts() {
    $("productList").innerHTML = "";
    debouncedUpdateInvoice();
}

function getProducts() {
    const nodes = document.querySelectorAll("#productList .product-item");
    const arr = [];
    nodes.forEach((n) => {
        const name = n.querySelector(".productName").value.trim();
        const qty = Number(n.querySelector(".productQty").value) || 0;
        const price = Number(n.querySelector(".productPrice").value) || 0;
        if (name) arr.push({ name, qty, price });
    });
    return arr;
}

function saveProducts() {
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(getProducts()));
}

/* ======== Form save/load (localStorage) ======== */
function saveForm() {
    const ids = [
        "shopName", "customerName", "customerPhone", "customerAddress",
        "orderDate", "expectedDate", "orderId", "paidAmount",
        "paymentMethod", "shippingFee", "shortNote", "note", "thankYouText"
    ];
    const data = {};
    ids.forEach((id) => {
        const el = $(id);
        if (el) data[id] = el.value;
    });
    localStorage.setItem(LS_FORM, JSON.stringify(data));
}

function loadForm() {
    const data = JSON.parse(localStorage.getItem(LS_FORM) || "{}");
    if (!data) return;
    Object.keys(data).forEach((k) => {
        if ($(k)) $(k).value = data[k];
    });
}

/* ======== Images save/load (IndexedDB) ======== */
async function handleImageUpload(inputId, outIds, storageKey) {
    const input = $(inputId);
    if (!input) return;

    const indicator = $(`${inputId}Indicator`);

    input.addEventListener("change", async (e) => {
        indicator.textContent = "";
        indicator.className = "upload-indicator";
        const f = e.target.files[0];
        if (!f) {
            indicator.style.display = "none";
            return;
        }
        indicator.textContent = "Đang tải...";
        indicator.className = "upload-indicator loading";
        indicator.style.display = "block";

        if (f.size > MAX_FILE_SIZE) {
            indicator.textContent = `Lỗi: File quá lớn (> 1MB). Vui lòng chọn file khác.`;
            indicator.className = "upload-indicator error";
            input.value = "";
            return;
        }

        try {
            const data = await dataURLFromFile(f);
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            store.put({ key: storageKey, data });

            transaction.oncomplete = () => {
                outIds.forEach((id) => {
                    if ($(id)) {
                        $(id).src = data;
                        $(id).style.display = "block";
                    }
                });
                indicator.textContent = "Tải lên thành công!";
                indicator.className = "upload-indicator success";
                setTimeout(() => {
                    indicator.style.display = "none";
                }, 3000);
                if (storageKey === "flowerImg") {
                    originalFlowerImageSrc = data;
                    document.querySelectorAll(".predefined-flower-img").forEach((img) => {
                        img.style.border = "2px solid transparent";
                    });
                }
            };

            transaction.onerror = () => {
                throw new Error('Lỗi khi lưu ảnh vào IndexedDB');
            };
        } catch (error) {
            console.error("Lỗi khi tải file:", error);
            indicator.textContent = "Lỗi khi tải file. Vui lòng thử lại.";
            indicator.className = "upload-indicator error";
            input.value = "";
        }
    });
}

async function loadImages() {
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const imgs = request.result.reduce((acc, { key, data }) => {
                acc[key] = data;
                return acc;
            }, {});
            console.log('Loaded images from IndexedDB:', imgs); // Debug

            const outLogo = $('outLogo');
            if (outLogo) {
                if (imgs.shopLogo) {
                    outLogo.src = imgs.shopLogo;
                    outLogo.style.display = 'block';
                } else {
                    outLogo.src = '';
                    outLogo.style.display = 'none';
                }
            }

            if (imgs.flowerImg) {
                originalFlowerImageSrc = imgs.flowerImg;
                if ($('flowerTL')) {
                    $('flowerTL').src = imgs.flowerImg;
                    $('flowerTL').style.display = 'block';
                }
                if ($('flowerBR')) {
                    $('flowerBR').src = imgs.flowerImg;
                    $('flowerBR').style.display = 'block';
                }
                document.querySelectorAll('.predefined-flower-img').forEach((img) => {
                    img.style.border = img.getAttribute('data-image') === imgs.flowerImg
                        ? '2px solid var(--accent)'
                        : '2px solid transparent';
                });
            } else {
                if ($('flowerTL')) $('flowerTL').style.display = 'none';
                if ($('flowerBR')) $('flowerBR').style.display = 'none';
                document.querySelectorAll('.predefined-flower-img').forEach((img) => {
                    img.style.border = '2px solid transparent';
                });
            }

            const outQr = $('outQr');
            if (outQr) {
                if (imgs.qrImg) {
                    outQr.src = imgs.qrImg;
                    outQr.style.display = 'block';
                } else {
                    outQr.src = '';
                    outQr.style.display = 'none';
                }
            }
            resolve();
        };

        request.onerror = () => {
            console.error('Error loading images:', request.error);
            reject(request.error);
        };
    });
}

/* ======== Theme ======== */
function setTheme(cls) {
    document.body.classList.remove("theme-0", "theme-1", "theme-2", "theme-3", "theme-4", "theme-5", "theme-6", "theme-7", "theme-8");
    document.body.classList.add(cls);
    localStorage.setItem(LS_THEME, cls);
}

function loadTheme() {
    const t = localStorage.getItem(LS_THEME) || "theme-1";
    setTheme(t);
    document.querySelectorAll(".theme-btn").forEach((b) => {
        b.classList.toggle("selected", b.dataset.theme === t);
    });
}

/* ======== Debounced Update ======== */
let updateTimeout = null;
function debouncedUpdateInvoice() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        updateInvoice();
        saveForm();
        saveProducts();
    }, 300);
}

function formatDate(date) {
    if (!date) return "";
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
}

/* ======== Update preview ======== */
function updateInvoice() {
    $("outShopName").innerText = $("shopName").value.trim() || "Shop Của Tôi";
    $("outCustomerName").innerText = $("customerName").value.trim() || "Tên khách hàng";
    $("outCustomerPhone").innerText = $("customerPhone").value.trim() || "SĐT";
    $("outCustomerAddress").innerText = $("customerAddress").value.trim() || "Địa chỉ nhận";
    $("outOrderDate").innerText = formatDate($("orderDate").value) || "__/__/____";
    $("outExpectedDate").innerText = formatDate($("expectedDate").value) || "__/__/____";
    $("outOrderId").innerText = $("orderId").value.trim().includes("#") ? "": $("orderId").value.trim() ;
    $("outPaymentMethod").innerText = $("paymentMethod").value || "Tiền mặt";
    $("outShortNote").innerText = $("shortNote").value.trim() || "";
    $("outThank").innerText = $("thankYouText").value.trim() || "Cảm ơn anh/chị đã tin tưởng ủng hộ Shop!";

    const prods = getProducts();
    const out = $("outProducts");
    out.innerHTML = "";
    let total = 0;
    if (prods.length === 0) {
        out.innerHTML = '<div style="text-align:center;color:var(--muted);padding:8px">Không có sản phẩm</div>';
    } else {
        const frag = document.createDocumentFragment();
        const headerRow = document.createElement("div");
        headerRow.className = "callout prod-row";
        headerRow.style = "color: var(--accent)";
        headerRow.innerHTML = `<div style="flex:1">Sản phẩm</div><div style="width:20px;text-align:right">SL</div><div style="width:90px;text-align:right">Đơn giá</div><div style="width:90px;text-align:right">Thành tiền</div>`;
        frag.appendChild(headerRow);
        prods.forEach((p) => {
            const subtotal = p.qty * p.price;
            total += subtotal;
            const row = document.createElement("div");
            row.className = "prod-row";
            row.innerHTML = `<div style="flex:1">${escapeHtml(p.name)}</div><div style="width:20px;text-align:right">${p.qty}</div><div style="width:90px;text-align:right">${toCurrency(p.price)} ₫</div><div style="width:90px;text-align:right">${toCurrency(subtotal)} ₫</div>`;
            frag.appendChild(row);
        });
        out.appendChild(frag);
    }
    const shipping = Number($("shippingFee").value) || 0;
    if (shipping > 0) {
        const r = document.createElement("div");
        r.className = "prod-row";
        r.innerHTML = `<div style="flex:1;">Phí ship</div><div style="width:90px;text-align:right"></div><div style="width:110px;text-align:right">${toCurrency(shipping)} ₫</div>`;
        out.appendChild(r);
        total += shipping;
    }
    $("outTotal").innerText = toCurrency(total) + " ₫";
    $("outPaidAmount").innerText = toCurrency($("paidAmount").value) + " ₫";
}

/* ======== Save/load products & form on start ======== */
function loadProducts() {
    const arr = JSON.parse(localStorage.getItem(LS_PRODUCTS) || "[]");
    $("productList").innerHTML = "";
    if (!arr || arr.length === 0) {
        addProduct({});
    } else arr.forEach((p) => addProduct(p));
}

function parseAndFillForm(text) {
    // Biểu thức chính quy cho thông tin chính
    const mainRegex = /Mã ĐH:\s*(\S+)\s*Người nhận:\s*(.+?),\s*(\d{10})\s*Địa chỉ:\s*(.+?)\s*Dự kiến giao:/s;
    
    // Biểu thức chính quy cho phí vận chuyển
    const shippingFeeRegex = /Người nhận trả cước:\s*([\d\.]+)\s*đ/;

    const mainMatch = text.match(mainRegex);
    const shippingFeeMatch = text.match(shippingFeeRegex);

    if (mainMatch) {
        const orderId = mainMatch[1];
        const recipientName = mainMatch[2];
        const phoneNumber = mainMatch[3];
        const address = mainMatch[4].trim().replace(/\s*-\s*/g, ' - ');

        // Gán giá trị vào các trường trên form
        // Bạn cần đảm bảo các ID này trùng khớp với cấu trúc HTML của bạn
        $('orderId').value = orderId + " - VTP";
        $('customerName').value = recipientName;
        $('customerPhone').value = phoneNumber;
        $('customerAddress').value = address;

        // Nếu tìm thấy phí vận chuyển, điền vào trường tương ứng
        if (shippingFeeMatch) {
            // Loại bỏ dấu chấm và chuyển đổi sang số nguyên
            const shippingFee = parseInt(shippingFeeMatch[1].replace(/\./g, ''), 10);
            $('shippingFee').value = shippingFee;
        }
        
        // Thông báo cho người dùng
        alert('Đã tự động điền thông tin đơn hàng!');
    } else {
        console.log('Không tìm thấy mẫu thông tin đơn hàng.');
    }
}



/* ======== Init Events ======== */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await openDB();
        $('note').addEventListener('paste', function(event) {
    const pastedText = (event.clipboardData || window.clipboardData).getData('text');
    parseAndFillForm(pastedText);
});


        // Đảm bảo flowerImg mặc định
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.get('flowerImg');
        request.onsuccess = () => {
            if (!request.result) {
                store.put({ key: 'flowerImg', data: 'assets/uploads/transparent.webp' });
                console.log('Set default flowerImg');
            }
        };
        request.onerror = () => console.error('Error checking default flowerImg:', request.error);

        // Load saved data
        loadForm();
        loadProducts();
        await loadImages();
        setMonthlyDecor();
        loadTheme();
        await renderHistory();
        updateInvoice();

        // Input live update
        document.querySelectorAll('#invoiceForm input:not([type="file"]), #invoiceForm textarea, #invoiceForm select')
            .forEach((inp) => inp.addEventListener("input", debouncedUpdateInvoice));

        // File uploads
        handleImageUpload("shopLogo", ["outLogo"], "shopLogo");
        handleImageUpload("flowerImage", ["flowerTL", "flowerBR"], "flowerImg");
        handleImageUpload("qrImage", ["outQr"], "qrImg");

        // Add/clear product
        $("addProductBtn").addEventListener("click", () => addProduct({}));
        $("clearProducts").addEventListener("click", () => {
            if (confirm("Xóa hết sản phẩm?")) clearProducts();
        });

        // Save/reset
        $("saveBtn").addEventListener("click", () => {
            saveForm();
            saveProducts();
            alert("Đã lưu vào trình duyệt.");
        });
        $("resetBtn").addEventListener("click", () => {
            if (confirm("Reset toàn bộ dữ liệu?")) {
                const transaction = db.transaction(['images', 'history'], 'readwrite');
                transaction.objectStore('images').clear();
                transaction.objectStore('history').clear();
                localStorage.removeItem(LS_FORM);
                localStorage.removeItem(LS_PRODUCTS);
                localStorage.removeItem(LS_THEME);
                location.reload();
            }
        });

        // Lịch sử đơn hàng
        $("saveToHistoryBtn").addEventListener("click", saveInvoiceToHistory);
        $("clearHistoryBtn").addEventListener("click", clearHistory);
        $("history-list").addEventListener("click", (event) => {
            const target = event.target;
            const id = target.getAttribute("data-id");
            if (target.classList.contains("load-btn")) {
                loadInvoiceFromHistory(id);
            } else if (target.classList.contains("delete-btn")) {
                deleteInvoiceFromHistory(id);
            }
        });

        // Theme buttons
        document.querySelectorAll(".theme-btn").forEach((btn) =>
            btn.addEventListener("click", () => {
                setTheme(btn.dataset.theme);
                btn.classList.add("selected");
                document.querySelectorAll(".theme-btn").forEach((b) => {
                    if (b !== btn) b.classList.remove("selected");
                });
            })
        );

        // Predefined flower images
        document.querySelectorAll(".predefined-flower-img").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const imagePath = btn.getAttribute("data-image");
                originalFlowerImageSrc = imagePath;
                await setDecorImageFromPath(imagePath);
                await loadImages();
            });
        });

        // Download PDF
// Hàm tiện ích để lấy phần tử DOM


// Hàm tạo Canvas từ hóa đơn
async function createInvoiceCanvas() {
    const card = $("card");
    const imgs = card.querySelectorAll("img");

    // Đợi tất cả ảnh tải hoàn tất
    await Promise.all(
        Array.from(imgs).map(
            (img) =>
                new Promise((resolve) => {
                    if (!img.src || img.complete) return resolve();
                    img.crossOrigin = "Anonymous"; // Hỗ trợ CORS cho ảnh từ nguồn khác
                    img.onload = resolve;
                    img.onerror = () => {
                        console.warn(`Failed to load image: ${img.src}`);
                        resolve();
                    };
                })
        )
    );

    const origWidth = card.offsetWidth || 360; // Sử dụng offsetWidth để chính xác hơn
    const targetWidth = 1080; // Độ rộng mục tiêu cho chất lượng cao
    const scale = Math.min(3, Math.max(1.5, targetWidth / origWidth)); // Giới hạn scale để tránh quá tải

    return html2canvas(card, {
        useCORS: true, // Hỗ trợ ảnh từ nguồn khác
        scale: scale, // Tự động điều chỉnh độ phân giải
        backgroundColor: null, // Giữ nền trong suốt
        logging: false, // Tắt log để cải thiện hiệu suất
        allowTaint: false, // Đảm bảo không có ảnh bị "tainted"
        windowWidth: document.body.scrollWidth, // Đảm bảo kích thước cửa sổ đầy đủ
        windowHeight: document.body.scrollHeight,
    });
}

// Xuất PDF
$("downloadPdf")?.addEventListener("click", async () => {
    const btn = $("downloadPdf");
    btn.disabled = true;
    btn.textContent = "Đang tạo PDF...";

    try {
        const canvas = await createInvoiceCanvas();
        const { jsPDF } = window.jspdf;
        const imgData = canvas.toDataURL("image/png", 1.0); // Chất lượng tối đa cho PNG
        const pxToMm = (px) => px * 0.264583; // Chuyển đổi pixel sang mm
        const pdfWidth = pxToMm(canvas.width);
        const pdfHeight = pxToMm(canvas.height);

        // Tạo PDF với kích thước chính xác
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: [pdfWidth, pdfHeight],
            compress: true, // Nén PDF để giảm kích thước file
        });

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, "", "FAST"); // Tối ưu tốc độ
        pdf.save(`invoice_${$("orderId")?.value || "order"}.pdf`);
        
    } catch (err) {
        console.error("PDF export error:", err);
        alert("Có lỗi khi tạo PDF. Vui lòng thử lại.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Tải PDF";
    }
});

function printInvoice() {
    window.print();
}
const printBtn = document.createElement("button");
printBtn.className = "btn";
printBtn.style.background ="#c970d0";
printBtn.textContent = "🖨️ In hóa đơn";
printBtn.addEventListener("click", printInvoice);
$("btns").appendChild(printBtn);
// Xuất PNG
async function safeExport() {
    const btn = $("downloadBtn");
    btn.disabled = true;
    btn.textContent = "Đang tạo ảnh...";

    try {
        const canvas = await createInvoiceCanvas();
        canvas.toBlob(
            (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `invoice_${$("orderId")?.value || "order"}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url); // Thu hồi ngay sau khi tải
               gtag('event', 'download_png', {
                    event_category: 'Invoice Actions',
                    event_label: `Invoice ${$("orderId")?.value || "order"}`,
                    value: 1 // Có thể dùng để đếm số lần tải
                });
            },
            "image/png",
            1.0 // Chất lượng tối đa cho PNG
        );
    } catch (err) {
        console.error("PNG export error:", err);
        alert("Có lỗi khi tạo ảnh. Vui lòng thử lại.");
    } finally {
        btn.disabled = false;
        btn.textContent = "📥 Tải ảnh (PNG)";
    }
}

// Chia sẻ ảnh
async function shareInvoice() {
    if (!navigator.share) {
        alert("Trình duyệt của bạn không hỗ trợ tính năng chia sẻ.");
        return;
    }

    const btn = $("shareBtn");
    btn.disabled = true;
    btn.textContent = "Đang tạo ảnh...";

    try {
        const canvas = await createInvoiceCanvas();
        const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1.0));
        const imageFile = new File([imageBlob], `invoice_${$("orderId")?.value || "order"}.png`, {
            type: "image/png",
        });
        const shopName = $("shopName")?.value || "Hóa đơn bán hàng";

        await navigator.share({
            files: [imageFile],
            title: shopName,
            text: "Hóa đơn từ cửa hàng",
        });
       gtag('event', 'share_invoice', { event_category: 'Invoice Actions', event_label: `Invoice ${$("orderId")?.value || "order"}` });
        
    } catch (error) {
        console.error("Share error:", error);
        if (error.name !== "AbortError") {
            alert("Không thể chia sẻ ảnh. Vui lòng thử lại.");
        }
    } finally {
        btn.disabled = false;
        btn.textContent = "📲 Chia sẻ ảnh";
    }
}

        $("shareBtn").addEventListener("click", shareInvoice);
        $("downloadBtn").addEventListener("click", safeExport);
    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        alert('Không thể khởi tạo ứng dụng. Vui lòng thử lại.');
    }
});


 
        (function(){
          let deferredPrompt;
          const installBtn = document.getElementById('installBtn');
          if (installBtn) {
            installBtn.style.display = "none";
          }
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (installBtn) {
              installBtn.style.display = 'flex';
              installBtn.setAttribute('aria-hidden','false');
            }
          });

          if (installBtn) {
            installBtn.addEventListener('click', () => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choice) => {
                  if (choice.outcome === 'accepted') {
                    console.log('Người dùng đã cài app');
                  } else {
                    console.log('Người dùng hủy cài app');
                  }
                  deferredPrompt = null;
                }).catch(()=>{ deferredPrompt = null; });
              }
            });
          }

          window.addEventListener('appinstalled', () => {
            console.log('App đã được cài đặt');
            if (installBtn) installBtn.style.display = 'none';
          });

          try {
            if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
              if (installBtn) installBtn.style.display = 'none';
            }
          } catch (e) {
            // noop
          }
        })();
        
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    alert('Đã xảy ra lỗi. Vui lòng thử lại.');
});      
        