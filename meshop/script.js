/* ======== Helpers & Constants ======== */
const $ = (id) => document.getElementById(id);
const LS_FORM = "invoice_v3_form";
const LS_PRODUCTS = "invoice_v3_products";
const LS_THEME = "invoice_v3_theme";
const MAX_FILE_SIZE = 2* 1024 * 1024;

// Hidden decor codes (keys are normalized WITHOUT leading '#')
const HIDDEN_DECOR_MAP = {
    vietnam: "assets/uploads/vietnam-national-day.png",
    midautumn: "assets/uploads/mid-autumn-festival.png",
    neko: "assets/uploads/maneki-neko.png",
    valentine: "assets/uploads/valentine.png",
    vulan: "assets/uploads/vulan.png",
    halloween: "assets/uploads/halloween.png",
    xmas: "assets/uploads/xmas.png"
};

let originalFlowerImageSrc = null;

// Map month -> decor (keys are month numbers)
const MONTHLY_DECOR_MAP = {
    2: "assets/uploads/valentine.png", // Feb - Valentine
    8: "assets/uploads/vulan.png", // Aug - Mid-Autumn
    9: "assets/uploads/vietnam-national-day.png", // Sep - VN National Day
    12: "assets/uploads/xmas.png" // Dec - Christmas
};

// IndexedDB setup
const DB_NAME = 'InvoiceV3DB';
const DB_VERSION = 1;
let db;

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

/* ======== Hiệu ứng đánh máy đã được tối ưu ======== */
let typingTimeout;
let cursorInterval;

function typeEffect() {
    const subtitleElement = document.querySelector('.subtitle');
    const textToType = "Hoàn thành trong 30 giây - Miễn phí - Tiện lợi - Dành cho shop online, freelancer & doanh nghiệp nhỏ.";

    clearTimeout(typingTimeout);
    clearInterval(cursorInterval);
    subtitleElement.textContent = "";

    const cursorElement = document.createElement('span');
    cursorElement.className = 'cursor';
    subtitleElement.appendChild(cursorElement);

    let i = 0;
    const typingSpeed = 45;
    const blinkingSpeed = 500;
    let cursorVisible = true;

    function typeWriter() {
        if (i < textToType.length) {
            cursorElement.style.opacity = 1;
            subtitleElement.insertBefore(document.createTextNode(textToType.charAt(i)), cursorElement);
            i++;
            typingTimeout = setTimeout(typeWriter, typingSpeed);
        } else {
            cursorInterval = setInterval(() => {
                cursorVisible = !cursorVisible;
                cursorElement.style.opacity = cursorVisible ? 1 : 0;
            }, blinkingSpeed);
        }
    }
    typeWriter();
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
        <input class="productQty" placeholder="SL" type="number" min="0" value="${p.qty || ""}">
        <input class="productPrice" placeholder="Giá (VNĐ)" type="number" min="0" value="${p.price || ""}">
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
    $("outOrderId").innerText = $("orderId").value.trim() || "";
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
        r.innerHTML = `<div style="flex:1">Phí ship</div><div style="width:36px"></div><div style="width:90px;text-align:right"></div><div style="width:110px;text-align:right">${toCurrency(shipping)} ₫</div>`;
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

/* ======== Init Events ======== */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await openDB();

        // Đảm bảo flowerImg mặc định
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.get('flowerImg');
        request.onsuccess = () => {
            if (!request.result) {
                store.put({ key: 'flowerImg', data: 'assets/uploads/transparent.png' });
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
        $("downloadPdf").addEventListener("click", () => {
            const capture = $("card");
            html2canvas(capture, { scale: 2 }).then((canvas) => {
                const { jsPDF } = window.jspdf;
                const imgData = canvas.toDataURL("image/png");
                const pxToMm = (px) => px * 0.264583;
                const pdfWidth = pxToMm(canvas.width);
                const pdfHeight = pxToMm(canvas.height);
                const pdf = new jsPDF("p", "mm", [pdfWidth, pdfHeight]);
                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                pdf.save(`invoice_${$("orderId").value || "order"}.pdf`);
            });
        });

        // Hàm tiện ích để tạo Canvas từ hóa đơn
        async function createInvoiceCanvas() {
            const card = $("card");
            const imgs = Array.from(card.querySelectorAll("img"));

            await Promise.all(
                imgs.map(
                    (img) =>
                        new Promise((resolve) => {
                            if (!img.src) return resolve();
                            if (img.complete) return resolve();
                            img.onload = () => resolve();
                            img.onerror = () => {
                                console.warn(`Failed to load image: ${img.src}`);
                                resolve();
                            };
                        })
                )
            );

            const origWidth = card.clientWidth || 360;
            const targetWidth = 1080;
            let scale = Math.min(3, Math.max(1.5, targetWidth / origWidth));

            return await html2canvas(card, {
                useCORS: true,
                scale: scale,
                backgroundColor: null,
            });
        }

        // Hàm xử lý việc tải ảnh xuống
        async function safeExport() {
            const btn = $("safeExportBtn") || $("downloadBtn");
            btn.disabled = true;
            btn.textContent = "Đang tạo ảnh...";

            try {
                const canvas = await createInvoiceCanvas();
                canvas.toBlob(
                    (blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `invoice_${$("orderId").value || "order"}.png`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(() => URL.revokeObjectURL(url), 10000);
                    },
                    "image/png",
                    0.95
                );
            } catch (err) {
                console.error('Export error:', err);
                alert("Có lỗi khi tạo ảnh. Thử lại nhé.");
            } finally {
                btn.disabled = false;
                btn.textContent = "📥 Tải ảnh (PNG)";
            }
        }

        // Hàm xử lý việc chia sẻ ảnh
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
                const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                const imageFile = new File([imageBlob], "hoa_don.png", { type: "image/png" });
                const shopName = $("shopName").value || "Hóa đơn bán hàng";

                await navigator.share({
                    files: [imageFile],
                    title: shopName,
                    text: ``,
                });
            } catch (error) {
                console.error("Lỗi khi chia sẻ:", error);
                if (error.name !== 'AbortError') {
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