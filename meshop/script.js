/* ======== Helpers & Constants ======== */
const $ = (id) => document.getElementById(id) || null;
const LS_FORM = "invoice_v3_form";
const LS_PRODUCTS = "invoice_v3_products";
const LS_THEME = "invoice_v3_theme";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

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
let db = null;

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
const flowerSelect = document.getElementById('flowerSelect');
if (flowerSelect) {
    flowerSelect.innerHTML = flowerImages.map(img => `
        <img class="predefined-flower-img" src="${img.src}" data-image="${img.src}" style="width: 50px; height: 50px; cursor: pointer; border: 2px solid transparent; border-radius: 4px; ${img.style || ''}" loading="lazy" alt="${img.alt}" tabindex="0">
    `).join('');
}
const themeSelect = document.getElementById('themeSelect');
if (themeSelect) {
    themeSelect.innerHTML = themes.map(theme => `
        <div class="swatch theme-btn" data-theme="${theme.id}" style="width: 34px; height: 24px; background: ${theme.gradient}; border-radius: 6px;" aria-label="Theme ${theme.id}" tabindex="0"></div>
    `).join('');
}

// Load saved theme
const savedTheme = localStorage.getItem('selectedTheme') || 'theme-0';
document.body.className = savedTheme;
document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn) btn.classList.toggle('selected', btn.dataset.theme === savedTheme);
});

// Load saved decor
const savedDecor = localStorage.getItem('selectedDecor');
if (savedDecor) {
    const flowerTL = $('flowerTL');
    const flowerBR = $('flowerBR');
    if (flowerTL) {
        flowerTL.src = savedDecor;
        flowerTL.style.display = 'block';
    }
    if (flowerBR) {
        flowerBR.src = savedDecor;
        flowerBR.style.display = 'block';
    }
    document.querySelectorAll('.predefined-flower-img').forEach(img => {
        img.classList.toggle('selected', img.src.endsWith(savedDecor));
    });
}

// Theme Selection
document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn) {
        btn.addEventListener('click', () => {
            document.body.className = btn.dataset.theme;
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            localStorage.setItem('selectedTheme', btn.dataset.theme);
        });
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                btn.click();
            }
        });
    }
});

// Flower Selection
document.querySelectorAll('.predefined-flower-img').forEach(img => {
    if (img) {
        img.addEventListener('click', () => {
            const flowerTL = $('flowerTL');
            const flowerBR = $('flowerBR');
            if (flowerTL) {
                flowerTL.src = img.src;
                flowerTL.style.display = 'block';
            }
            if (flowerBR) {
                flowerBR.src = img.src;
                flowerBR.style.display = 'block';
            }
            document.querySelectorAll('.predefined-flower-img').forEach(i => i.classList.remove('selected'));
            img.classList.add('selected');
            localStorage.setItem('selectedDecor', img.src.split('/').pop());
        });
        img.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                img.click();
            }
        });
    }
});

async function openDB() {
    if (!window.indexedDB) {
        console.warn("IndexedDB not supported, falling back to localStorage for images");
        return null;
    }
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains('images')) {
                dbInstance.createObjectStore('images', { keyPath: 'key' });
            }
            if (!dbInstance.objectStoreNames.contains('history')) {
                dbInstance.createObjectStore('history', { keyPath: 'timestamp' });
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
    if (iosModal) iosModal.style.display = 'block';
}

closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (iosModal) iosModal.style.display = 'none';
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

            if (db) {
                const transaction = db.transaction(['images'], 'readonly');
                const store = transaction.objectStore('images');
                const request = store.get('flowerImg');
                request.onsuccess = () => {
                    const imgs = request.result ? { flowerImg: request.result.data } : {};
                    if (Object.values(HIDDEN_DECOR_MAP).includes(imgs.flowerImg)) {
                        setDecorImageFromPath(originalFlowerImageSrc || "");
                    }
                };
            }
        });
    }
});

async function setDecorImageFromPath(path) {
    if (db) {
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        store.put({ key: 'flowerImg', data: path });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log(`Set flowerImg to: ${path}`);
                const flowerTL = $('flowerTL');
                const flowerBR = $('flowerBR');
                if (flowerTL) {
                    flowerTL.src = path;
                    flowerTL.style.display = path ? 'block' : 'none';
                }
                if (flowerBR) {
                    flowerBR.src = path;
                    flowerBR.style.display = path ? 'block' : 'none';
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
    } else {
        console.warn('Using localStorage fallback for decor image');
        localStorage.setItem('flowerImg', path);
    }
}

/* ======== Hiệu ứng đánh máy tối ưu với requestAnimationFrame ======== */
function typeEffect() {
    const subtitleElement = document.querySelector('.subtitle');
    if (!subtitleElement) return;
    const textToType = "Hoàn thành trong 30 giây - Miễn phí - Tiện lợi - Dành cho shop online, freelancer & doanh nghiệp nhỏ.";

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
            setTimeout(() => requestAnimationFrame(typeWriter), typingSpeed);
        } else {
            setInterval(() => {
                cursorVisible = !cursorVisible;
                cursorElement.style.opacity = cursorVisible ? 1 : 0;
            }, blinkingSpeed);
        }
    }
    requestAnimationFrame(typeWriter);
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
    return String(s || "").replace(/[&<>\"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[m]);
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

    if (db) {
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
    } else {
        formState.images = {};
        formState.theme = localStorage.getItem(LS_THEME) || "theme-0";
        return formState;
    }
}

async function loadFormData(data) {
    if (!data) return;
    const ids = [
        "shopName", "customerName", "customerPhone", "customerAddress",
        "orderDate", "expectedDate", "orderId", "paidAmount",
        "paymentMethod", "shippingFee", "shortNote", "note", "thankYouText"
    ];
    ids.forEach((id) => {
        const el = $(id);
        if (el && data[id] !== undefined) el.value = data[id];
    });

    if (data.products) {
        const productList = $("productList");
        if (productList) productList.innerHTML = "";
        data.products.forEach((p) => addProduct(p));
    }

    if (data.images) {
        if (db) {
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            Object.entries(data.images || {}).forEach(([key, value]) => {
                store.put({ key, data: value });
            });
            await loadImages();
        } else {
            Object.entries(data.images || {}).forEach(([key, value]) => localStorage.setItem(key, value));
            await loadImages();
        }
    }

    if (data.theme) {
        setTheme(data.theme);
        document.querySelectorAll(".theme-btn").forEach((b) => {
            if (b) b.classList.toggle("selected", b.dataset.theme === data.theme);
        });
    }
    updateInvoice();
}

async function saveInvoiceToHistory() {
    const invoiceData = await getFormData();
    invoiceData.timestamp = Date.now();

    if (db) {
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
    } else {
        let history = JSON.parse(localStorage.getItem('history') || '[]');
        history.push(invoiceData);
        localStorage.setItem('history', JSON.stringify(history));
        renderHistory();
        alert('Đã lưu hóa đơn vào lịch sử (fallback localStorage).');
    }
}

async function renderHistory() {
    if (db) {
        const transaction = db.transaction(['history'], 'readonly');
        const store = transaction.objectStore('history');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                let history = request.result;
                const historyList = $('history-list');
                if (historyList) historyList.innerHTML = '';

                if (!history || history.length === 0) {
                    if (historyList) historyList.innerHTML = `<p class="">Chưa có hóa đơn nào được lưu.</p>`;
                    return resolve();
                }

                history.sort((a, b) => b.timestamp - a.timestamp);
                const limitedHistory = history.slice(0, 10);

                limitedHistory.forEach((inv) => {
                    const li = document.createElement("li");
                    li.classList.add(inv.theme || "theme-0");

                    const thumbSrc = inv.images && inv.images.flowerImg ? escapeHtml(inv.images.flowerImg) : '';
                    const thumbDisplay = thumbSrc ? 'block' : 'none';

                    const total = inv.products.reduce((sum, p) => sum + (p.qty * p.price), 0) + (Number(inv.shippingFee) || 0);

                    li.innerHTML = `
                        <img class="flower-thumbnail" src="${thumbSrc}" alt="Decor" style="display: ${thumbDisplay};">
                        <div class="invoice-details">
                            <span class="history-shop-name">${escapeHtml(inv.customerName || 'Đơn hàng')} - ${escapeHtml(inv.customerPhone || 'Không có SĐT')}</span>
                            <span class="history-date">${new Date(inv.timestamp).toLocaleString('vi-VN')}</span>
                            <strong class="small history-total"> ${toCurrency(total)} ₫</strong>
                        </div>
                        <div class="invoice-actions">
                            <button class="load-btn" data-id="${inv.timestamp}">↶ Tải lại</button>
                            <button class="delete-btn" data-id="${inv.timestamp}">× Xóa</button>
                        </div>
                    `;
                    if (historyList) historyList.appendChild(li);
                });
                resolve();
            };

            request.onerror = () => {
                console.error('Error fetching history:', request.error);
                alert('Lỗi khi tải lịch sử hóa đơn.');
                reject(request.error);
            };
        });
    } else {
        let history = JSON.parse(localStorage.getItem('history') || '[]');
        const historyList = $('history-list');
        if (historyList) historyList.innerHTML = '';

        if (!history || history.length === 0) {
            if (historyList) historyList.innerHTML = `<p class="">Chưa có hóa đơn nào được lưu.</p>`;
            return;
        }

        history.sort((a, b) => b.timestamp - a.timestamp);
        const limitedHistory = history.slice(0, 10);

        limitedHistory.forEach((inv) => {
            const li = document.createElement("li");
            li.classList.add(inv.theme || "theme-0");

            const thumbSrc = inv.images && inv.images.flowerImg ? escapeHtml(inv.images.flowerImg) : '';
            const thumbDisplay = thumbSrc ? 'block' : 'none';

            const total = inv.products.reduce((sum, p) => sum + (p.qty * p.price), 0) + (Number(inv.shippingFee) || 0);

            li.innerHTML = `
                <img class="flower-thumbnail" src="${thumbSrc}" alt="Decor" style="display: ${thumbDisplay};">
                <div class="invoice-details">
                    <span class="history-shop-name">${escapeHtml(inv.customerName || 'Đơn hàng')} - ${escapeHtml(inv.customerPhone || 'Không có SĐT')}</span>
                    <span class="history-date">${new Date(inv.timestamp).toLocaleString('vi-VN')}</span>
                    <strong class="small history-total"> ${toCurrency(total)} ₫</strong>
                </div>
                <div class="invoice-actions">
                    <button class="load-btn" data-id="${inv.timestamp}">↶ Tải lại</button>
                    <button class="delete-btn" data-id="${inv.timestamp}">× Xóa</button>
                </div>
            `;
            if (historyList) historyList.appendChild(li);
        });
    }
}

async function loadInvoiceFromHistory(id) {
    if (db) {
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
    } else {
        let history = JSON.parse(localStorage.getItem('history') || '[]');
        const invoiceToLoad = history.find(inv => inv.timestamp === Number(id));
        if (invoiceToLoad) {
            loadFormData(invoiceToLoad);
            alert(`Đã tải lại hóa đơn "${invoiceToLoad.shopName || 'Đơn hàng'}".`);
        }
    }
}

async function deleteInvoiceFromHistory(id) {
    if (!confirm('Bạn có muốn xóa hóa đơn này không?')) return;

    if (db) {
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
    } else {
        let history = JSON.parse(localStorage.getItem('history') || '[]');
        history = history.filter(inv => inv.timestamp !== Number(id));
        localStorage.setItem('history', JSON.stringify(history));
        renderHistory();
        alert('Đã xóa hóa đơn khỏi lịch sử (fallback localStorage).');
    }
}

async function clearHistory() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử hóa đơn?')) return;

    if (db) {
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
    } else {
        localStorage.removeItem('history');
        renderHistory();
        alert('Đã xóa toàn bộ lịch sử (fallback localStorage).');
    }
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
    const removeBtn = el.querySelector(".remove-btn");
    if (removeBtn) removeBtn.addEventListener("click", () => {
        el.remove();
        debouncedUpdateInvoice();
    });
    el.querySelectorAll("input").forEach((i) => i.addEventListener("input", debouncedUpdateInvoice));
    return el;
}

function addProduct(p) {
    const productList = $("productList");
    if (productList) productList.appendChild(createProductElement(p || {}));
    debouncedUpdateInvoice();
}

function clearProducts() {
    const productList = $("productList");
    if (productList) productList.innerHTML = "";
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
        const el = $(k);
        if (el) el.value = data[k];
    });
}

/* ======== Images save/load (IndexedDB with fallback) ======== */
async function handleImageUpload(inputId, outIds, storageKey) {
    const input = $(inputId);
    if (!input) return;

    const indicator = $(`${inputId}Indicator`);

    input.addEventListener("change", async (e) => {
        if (indicator) {
            indicator.textContent = "";
            indicator.className = "upload-indicator";
        }
        const f = e.target.files[0];
        if (!f) {
            if (indicator) indicator.style.display = "none";
            return;
        }
        if (indicator) {
            indicator.textContent = "Đang tải...";
            indicator.className = "upload-indicator loading";
            indicator.style.display = "block";
        }

        if (f.size > MAX_FILE_SIZE) {
            if (indicator) {
                indicator.textContent = `Lỗi: File quá lớn (> 2MB). Vui lòng chọn file khác.`;
                indicator.className = "upload-indicator error";
            }
            input.value = "";
            return;
        }

        try {
            const data = await dataURLFromFile(f);
            if (db) {
                const transaction = db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                store.put({ key: storageKey, data });

                transaction.oncomplete = () => {
                    outIds.forEach((id) => {
                        const el = $(id);
                        if (el) {
                            el.src = data;
                            el.style.display = "block";
                        }
                    });
                    if (indicator) {
                        indicator.textContent = "Tải lên thành công!";
                        indicator.className = "upload-indicator success";
                        setTimeout(() => indicator.style.display = "none", 3000);
                    }
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
            } else {
                localStorage.setItem(storageKey, data);
                outIds.forEach((id) => {
                    const el = $(id);
                    if (el) {
                        el.src = data;
                        el.style.display = "block";
                    }
                });
                if (indicator) {
                    indicator.textContent = "Tải lên thành công (fallback localStorage)!";
                    indicator.className = "upload-indicator success";
                    setTimeout(() => indicator.style.display = "none", 3000);
                }
            }
        } catch (error) {
            console.error("Lỗi khi tải file:", error);
            if (indicator) {
                indicator.textContent = "Lỗi khi tải file. Vui lòng thử lại.";
                indicator.className = "upload-indicator error";
            }
            input.value = "";
        }
    });
}

async function loadImages() {
    if (db) {
        const transaction = db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const imgs = request.result.reduce((acc, { key, data }) => {
                    acc[key] = data;
                    return acc;
                }, {});
                console.log('Loaded images from IndexedDB:', imgs);

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
                    const flowerTL = $('flowerTL');
                    const flowerBR = $('flowerBR');
                    if (flowerTL) {
                        flowerTL.src = imgs.flowerImg;
                        flowerTL.style.display = 'block';
                    }
                    if (flowerBR) {
                        flowerBR.src = imgs.flowerImg;
                        flowerBR.style.display = 'block';
                    }
                    document.querySelectorAll('.predefined-flower-img').forEach((img) => {
                        img.style.border = img.getAttribute('data-image') === imgs.flowerImg
                            ? '2px solid var(--accent)'
                            : '2px solid transparent';
                    });
                } else {
                    const flowerTL = $('flowerTL');
                    const flowerBR = $('flowerBR');
                    if (flowerTL) flowerTL.style.display = 'none';
                    if (flowerBR) flowerBR.style.display = 'none';
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
    } else {
        const imgs = {
            shopLogo: localStorage.getItem('shopLogo'),
            flowerImg: localStorage.getItem('flowerImg'),
            qrImg: localStorage.getItem('qrImg')
        };
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
            const flowerTL = $('flowerTL');
            const flowerBR = $('flowerBR');
            if (flowerTL) {
                flowerTL.src = imgs.flowerImg;
                flowerTL.style.display = 'block';
            }
            if (flowerBR) {
                flowerBR.src = imgs.flowerImg;
                flowerBR.style.display = 'block';
            }
            document.querySelectorAll('.predefined-flower-img').forEach((img) => {
                img.style.border = img.getAttribute('data-image') === imgs.flowerImg
                    ? '2px solid var(--accent)'
                    : '2px solid transparent';
            });
        } else {
            const flowerTL = $('flowerTL');
            const flowerBR = $('flowerBR');
            if (flowerTL) flowerTL.style.display = 'none';
            if (flowerBR) flowerBR.style.display = 'none';
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
    }
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
        if (b) b.classList.toggle("selected", b.dataset.theme === t);
    });
}

/* ======== Debounced Update ======== */
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
const debouncedUpdateInvoice = debounce(() => {
    updateInvoice();
    saveForm();
    saveProducts();
}, 300);

function formatDate(date) {
    if (!date) return "";
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
}

/* ======== Update preview ======== */
function updateInvoice() {
    const values = {
        shopName: $("shopName")?.value.trim() || "Shop Của Tôi",
        customerName: $("customerName")?.value.trim() || "Tên khách hàng",
        customerPhone: $("customerPhone")?.value.trim() || "SĐT",
        customerAddress: $("customerAddress")?.value.trim() || "Địa chỉ nhận",
        orderDate: formatDate($("orderDate")?.value) || "__/__/____",
        expectedDate: formatDate($("expectedDate")?.value) || "__/__/____",
        orderId: $("orderId")?.value.trim().includes("#") ? "" : $("orderId")?.value.trim(),
        paymentMethod: $("paymentMethod")?.value || "Tiền mặt",
        shortNote: $("shortNote")?.value.trim() || "",
        thankYouText: $("thankYouText")?.value.trim() || "Cảm ơn anh/chị đã tin tưởng ủng hộ Shop!"
    };
    const outShopName = $("outShopName");
    if (outShopName) outShopName.innerText = values.shopName;
    const outCustomerName = $("outCustomerName");
    if (outCustomerName) outCustomerName.innerText = values.customerName;
    const outCustomerPhone = $("outCustomerPhone");
    if (outCustomerPhone) outCustomerPhone.innerText = values.customerPhone;
    const outCustomerAddress = $("outCustomerAddress");
    if (outCustomerAddress) outCustomerAddress.innerText = values.customerAddress;
    const outOrderDate = $("outOrderDate");
    if (outOrderDate) outOrderDate.innerText = values.orderDate;
    const outExpectedDate = $("outExpectedDate");
    if (outExpectedDate) outExpectedDate.innerText = values.expectedDate;
    const outOrderId = $("outOrderId");
    if (outOrderId) outOrderId.innerText = values.orderId;
    const outPaymentMethod = $("outPaymentMethod");
    if (outPaymentMethod) outPaymentMethod.innerText = values.paymentMethod;
    const outShortNote = $("outShortNote");
    if (outShortNote) outShortNote.innerText = values.shortNote;
    const outThank = $("outThank");
    if (outThank) outThank.innerText = values.thankYouText;

    const prods = getProducts();
    const out = $("outProducts");
    if (out) out.innerHTML = "";
    let total = 0;
    if (prods.length === 0) {
        if (out) out.innerHTML = '<div style="text-align:center;color:var(--muted);padding:8px">Không có sản phẩm</div>';
    } else {
        const frag = document.createDocumentFragment();
        const headerRow = document.createElement("div");
        headerRow.className = "callout prod-row";
        headerRow.style = "color: var(--accent)";
        headerRow.innerHTML = `<div style="flex:1">Sản phẩm</div><div style="width:20px;text-align:right">SL</div><div style="width:70px;text-align:right">Đơn giá</div><div style="width:70px;text-align:right">Thành tiền</div>`;
        frag.appendChild(headerRow);
        prods.forEach((p) => {
            const subtotal = p.qty * p.price;
            total += subtotal;
            const row = document.createElement("div");
            row.className = "prod-row";
            row.innerHTML = `<div style="flex:1">${escapeHtml(p.name)}</div><div style="width:20px;text-align:right">${p.qty}</div><div style="width:70px;text-align:right">${toCurrency(p.price)} ₫</div><div style="width:70px;text-align:right">${toCurrency(subtotal)} ₫</div>`;
            frag.appendChild(row);
        });
        if (out) out.appendChild(frag);
    }
    
    const shipping = Number($("shippingFee")?.value) || 0;
    if (shipping > 0) {
        const r = document.createElement("div");
        r.className = "prod-row";
        r.innerHTML = `<div style="flex:1">Phí ship</div><div style="width:36px"></div><div style="width:90px;text-align:right"></div><div style="width:90px;text-align:right">${toCurrency(shipping)} ₫</div>`;
        if (out) out.appendChild(r);
        total += shipping;
    }
    const outTotal = $("outTotal");
    if (outTotal) outTotal.innerText = toCurrency(total) + " ₫";
    const outPaidAmount = $("outPaidAmount");
    if (outPaidAmount) outPaidAmount.innerText = toCurrency($("paidAmount")?.value) + " ₫";
}

/* ======== Save/load products & form on start ======== */
function loadProducts() {
    const arr = JSON.parse(localStorage.getItem(LS_PRODUCTS) || "[]");
    const productList = $("productList");
    if (productList) productList.innerHTML = "";
    if (!arr || arr.length === 0) {
        addProduct({});
    } else arr.forEach((p) => addProduct(p));
}

/* ======== Init Events ======== */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await openDB();

        if (db) {
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
        }

        loadForm();
        loadProducts();
        await loadImages();
        setMonthlyDecor();
        loadTheme();
        await renderHistory();
        updateInvoice();

        document.querySelectorAll('#invoiceForm input:not([type="file"]), #invoiceForm textarea, #invoiceForm select')
            .forEach((inp) => inp.addEventListener("input", debouncedUpdateInvoice));

        handleImageUpload("shopLogo", ["outLogo"], "shopLogo");
        handleImageUpload("flowerImage", ["flowerTL", "flowerBR"], "flowerImg");
        handleImageUpload("qrImage", ["outQr"], "qrImg");

        const addProductBtn = $("addProductBtn");
        if (addProductBtn) addProductBtn.addEventListener("click", () => addProduct({}));
        const clearProductsBtn = $("clearProducts");
        if (clearProductsBtn) clearProductsBtn.addEventListener("click", () => {
            if (confirm("Xóa hết sản phẩm?")) clearProducts();
        });

        const saveBtn = $("saveBtn");
        if (saveBtn) saveBtn.addEventListener("click", () => {
            saveForm();
            saveProducts();
            alert("Đã lưu vào trình duyệt.");
        });
        const resetBtn = $("resetBtn");
        if (resetBtn) resetBtn.addEventListener("click", () => {
            if (confirm("Reset toàn bộ dữ liệu?")) {
                if (db) {
                    const transaction = db.transaction(['images', 'history'], 'readwrite');
                    transaction.objectStore('images').clear();
                    transaction.objectStore('history').clear();
                }
                localStorage.removeItem(LS_FORM);
                localStorage.removeItem(LS_PRODUCTS);
                localStorage.removeItem(LS_THEME);
                location.reload();
            }
        });

        const saveToHistoryBtn = $("saveToHistoryBtn");
        if (saveToHistoryBtn) saveToHistoryBtn.addEventListener("click", saveInvoiceToHistory);
        const clearHistoryBtn = $("clearHistoryBtn");
        if (clearHistoryBtn) clearHistoryBtn.addEventListener("click", clearHistory);
        const historyList = $("history-list");
        if (historyList) historyList.addEventListener("click", (event) => {
            const target = event.target;
            const id = target.getAttribute("data-id");
            if (target.classList.contains("load-btn")) {
                loadInvoiceFromHistory(id);
            } else if (target.classList.contains("delete-btn")) {
                deleteInvoiceFromHistory(id);
            }
        });

        document.querySelectorAll(".theme-btn").forEach((btn) => {
            if (btn) btn.addEventListener("click", () => {
                setTheme(btn.dataset.theme);
                btn.classList.add("selected");
                document.querySelectorAll(".theme-btn").forEach((b) => {
                    if (b !== btn) b.classList.remove("selected");
                });
            });
        });

        document.querySelectorAll(".predefined-flower-img").forEach((btn) => {
            if (btn) btn.addEventListener("click", async () => {
                const imagePath = btn.getAttribute("data-image");
                originalFlowerImageSrc = imagePath;
                await setDecorImageFromPath(imagePath);
                await loadImages();
            });
        });



        // Hàm tiện ích để tạo Canvas từ hóa đơn với chất lượng cao

async function createInvoiceCanvas() {
    const card = $("card");
    if (!card) return null;
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
    const targetWidth = 1080; // Mục tiêu chiều rộng 1080px cho chất lượng cao
    const devicePixelRatio = window.devicePixelRatio || 1;
    let scale = Math.min(4, Math.max(3, targetWidth / origWidth * devicePixelRatio)); // Tăng scale, tối đa 4

    return await html2canvas(card, {
        useCORS: true,
        scale: scale,
        backgroundColor: null,
        logging: false,
        windowWidth: targetWidth,
        imageTimeout: 10000 // Tăng thời gian chờ tải ảnh
    });
}

// Hàm xử lý tải xuống PDF
const downloadPdfBtn = $("downloadPdf");
if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", async () => {
    const capture = $("card");
    if (capture) {
        try {
            const canvas = await createInvoiceCanvas();
            if (!canvas) throw new Error("Không thể tạo canvas");
            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL("image/png", 1.0);
            
            // Kích thước A4 ở 300 DPI
            const a4Width = 210; // mm
            const a4Height = 297; // mm
            const dpi = 300;
            const pxToMm = (px) => px * 25.4 / dpi;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const pdfWidth = pxToMm(canvasWidth);
            const pdfHeight = pxToMm(canvasHeight);
            
            // Tạo PDF với kích thước A4
            const pdf = new jsPDF({
                orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
                unit: "mm",
                format: "a4",
                compression: false // Tắt nén để giữ chất lượng
            });
            
            // Tính tỷ lệ để vừa trang A4
            const scale = Math.min(a4Width / pdfWidth, a4Height / pdfHeight);
            const scaledWidth = pdfWidth * scale;
            const scaledHeight = pdfHeight * scale;
            const xOffset = (a4Width - scaledWidth) / 2;
            const yOffset = (a4Height - scaledHeight) / 2;
            
            pdf.addImage(imgData, "PNG", xOffset, yOffset, scaledWidth, scaledHeight, null, 'NONE');
            pdf.save(`invoice_${$("orderId")?.value || "order"}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
            alert("Có lỗi khi tạo PDF. Thử lại nhé.");
        }
    }
});

        // Hàm xử lý việc tải ảnh xuống
        async function safeExport() {
            const btn = $("downloadBtn");
            if (!btn) return;
            btn.disabled = true;
            btn.textContent = "Đang tạo ảnh...";

            try {
                const canvas = await createInvoiceCanvas();
                if (canvas) {
                    canvas.toBlob(
                        (blob) => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `invoice_${$("orderId")?.value || "order"}.png`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            setTimeout(() => URL.revokeObjectURL(url), 10000);
                        },
                        "image/png",
                        1.0 // Chất lượng tối đa
                    );
                }
            } catch (err) {
                console.error('Export error:', err);
                alert("Có lỗi khi tạo ảnh. Thử lại nhé.");
            } finally {
                btn.disabled = false;
                btn.textContent = "🖼️ Tải xuống PNG";
            }
        }

        // Hàm xử lý việc chia sẻ ảnh
        async function shareInvoice() {
            if (!navigator.share) {
                alert("Trình duyệt của bạn không hỗ trợ tính năng chia sẻ.");
                return;
            }

            const btn = $("shareBtn");
            if (!btn) return;
            btn.disabled = true;
            btn.textContent = "Đang tạo ảnh...";

            try {
                const canvas = await createInvoiceCanvas();
                if (canvas) {
                    const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
                    const imageFile = new File([imageBlob], "hoa_don.png", { type: "image/png" });
                    const shopName = $("shopName")?.value || "Hóa đơn bán hàng";

                    await navigator.share({
                        files: [imageFile],
                        title: shopName,
                        text: ``,
                    });
                }
            } catch (error) {
                console.error("Lỗi khi chia sẻ:", error);
                if (error.name !== 'AbortError') {
                    alert("Không thể chia sẻ ảnh. Vui lòng thử lại.");
                }
            } finally {
                btn.disabled = false;
                btn.textContent = "📤 Chia sẻ ảnh";
            }
        }

        const shareBtn = $("shareBtn");
        if (shareBtn) shareBtn.addEventListener("click", shareInvoice);
        const downloadBtn = $("downloadBtn");
        if (downloadBtn) downloadBtn.addEventListener("click", safeExport);

        // Form validation example for customerPhone
        const customerPhone = $("customerPhone");
        if (customerPhone) {
            customerPhone.addEventListener("invalid", (e) => {
                const errorSpan = customerPhone.nextElementSibling;
                if (errorSpan && errorSpan.classList.contains('error')) {
                    errorSpan.textContent = "Vui lòng nhập số điện thoại hợp lệ (10-11 số).";
                }
            });
            customerPhone.addEventListener("input", (e) => {
                const errorSpan = customerPhone.nextElementSibling;
                if (errorSpan && errorSpan.classList.contains('error')) {
                    errorSpan.textContent = "";
                }
            });
        }
    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        alert('Không thể khởi tạo ứng dụng. Vui lòng thử lại.');
    }
});