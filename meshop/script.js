
            /* ======== Helpers ======== */
            const $ = (id) => document.getElementById(id);
            const LS_FORM = "invoice_v3_form";
            const LS_PRODUCTS = "invoice_v3_products";
            const LS_IMAGES = "invoice_v3_images";
            const LS_THEME = "invoice_v3_theme";
            const LS_HISTORY = "invoice_v3_history"; // Khóa mới cho lịch sử
            const MAX_FILE_SIZE = 1024 * 1024;
            // Thay đổi: Thêm một map chứa tất cả các mã ẩn và đường dẫn ảnh tương ứng
            const HIDDEN_DECOR_MAP = {
                "#vietnam": "assets/uploads/vietnam-national-day.png",
                "#midautumn": "assets/uploads/mid-autumn-festival.png",
                "#neko": "assets/uploads/maneki-neko.png",
                "#valentine": "assets/uploads/valentine.png",
                "#halloween": "assets/uploads/halloween.png",
                "#xmas": "assets/uploads/xmas.png"
                // Thêm các mã ẩn khác vào đây
            };

            let originalFlowerImageSrc = null;
            // Bạn có thể tùy chỉnh ảnh decor theo từng tháng tại đây
            const MONTHLY_DECOR_MAP = {
                12: "assets/uploads/xmas.png", // Tháng 2: Valentine
                2: "assets/uploads/valentine.png", // Ví dụ tháng 3
                8: "assets/uploads/mid-autumn-festival.png", // Ví dụ tháng 8
                9: "assets/uploads/vietnam-national-day.png" // Ví dụ tháng 8

                // Thêm các tháng khác vào đây
            };

            function setMonthlyDecor() {
                const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed
                const monthlyImagePath = MONTHLY_DECOR_MAP[currentMonth];
                // Cập nhật hoa ở nền hero section
                console.log(currentMonth);
                document.documentElement.style.setProperty(
                    "--flower-image",
                    monthlyImagePath ? `url(${monthlyImagePath})` : "none"
                );
                return;
            }

            // Thay đổi: Cập nhật event listener cho ô Mã đơn
            $("orderId").addEventListener("input", (e) => {
                const orderId = e.target.value.trim().toLowerCase();
                const hiddenImagePath = HIDDEN_DECOR_MAP[orderId];

                // Kiểm tra nếu mã nhập vào là một mã ẩn hợp lệ
                if (hiddenImagePath) {
                    setDecorImageFromPath(hiddenImagePath);
                }
                // Nếu mã nhập vào là '#reset'
                else if (orderId === "#reset") {
                    setDecorImageFromPath(originalFlowerImageSrc || "");
                }
                // Nếu không có mã ẩn nào được nhập, khôi phục về ảnh gốc
                else {
                    const imgs = JSON.parse(
                        localStorage.getItem(LS_IMAGES) || "{}"
                    );
                    // Kiểm tra xem ảnh hiện tại có phải là ảnh mã ẩn không
                    if (
                        Object.values(HIDDEN_DECOR_MAP).includes(imgs.flowerImg)
                    ) {
                        setDecorImageFromPath(originalFlowerImageSrc || "");
                    }
                }
            });

            function setDecorImageFromPath(path) {
                const imgs = JSON.parse(
                    localStorage.getItem(LS_IMAGES) || "{}"
                );
                imgs.flowerImg = path;
                localStorage.setItem(LS_IMAGES, JSON.stringify(imgs));
                if ($("flowerTL")) {
                    $("flowerTL").src = path;
                    $("flowerTL").style.display = "block";
                }
                if ($("flowerBR")) {
                    $("flowerBR").src = path;
                    $("flowerBR").style.display = "block";
                }
                document
                    .querySelectorAll(".predefined-flower-img")
                    .forEach((img) => {
                        if (img.getAttribute("data-image") === path) {
                            img.style.border = "2px solid var(--accent)";
                        } else {
                            img.style.border = "2px solid transparent";
                        }
                    });
            }

            /* ======== IndexedDB functions ======== */
            function initDB() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(DB_NAME, DB_VERSION);
                    request.onerror = (event) => {
                        console.error(
                            "IndexedDB error:",
                            event.target.errorCode
                        );
                        reject("IndexedDB error: " + event.target.errorCode);
                    };
                    request.onsuccess = (event) => {
                        db = event.target.result;
                        resolve(db);
                    };
                    request.onupgradeneeded = (event) => {
                        db = event.target.result;
                        if (!db.objectStoreNames.contains(STORE_NAME)) {
                            db.createObjectStore(STORE_NAME, { keyPath: "id" });
                        }
                    };
                });
            }

            function saveImageToDB(id, dataUrl) {
                return new Promise((resolve, reject) => {
                    if (!db) {
                        return reject("IndexedDB not initialized.");
                    }
                    const transaction = db.transaction(
                        [STORE_NAME],
                        "readwrite"
                    );
                    const store = transaction.objectStore(STORE_NAME);
                    store.put({ id: id, data: dataUrl });

                    transaction.oncomplete = () => resolve();
                    transaction.onerror = (event) => reject(event.target.error);
                });
            }

            function loadImageFromDB(id) {
                return new Promise((resolve, reject) => {
                    if (!db) {
                        return reject("IndexedDB not initialized.");
                    }
                    const transaction = db.transaction(
                        [STORE_NAME],
                        "readonly"
                    );
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.get(id);

                    request.onsuccess = (event) => {
                        const result = event.target.result;
                        resolve(result ? result.data : null);
                    };
                    request.onerror = (event) => reject(event.target.error);
                });
            }

            function deleteImagesFromDB() {
                return new Promise((resolve, reject) => {
                    if (!db) {
                        return reject("IndexedDB not initialized.");
                    }
                    const transaction = db.transaction(
                        [STORE_NAME],
                        "readwrite"
                    );
                    const store = transaction.objectStore(STORE_NAME);
                    store.clear();

                    transaction.oncomplete = () => resolve();
                    transaction.onerror = (event) => reject(event.target.error);
                });
            }
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
                    /[&<>"']/g,
                    (m) =>
                        ({
                            "&": "&amp;",
                            "<": "&lt;",
                            ">": "&gt;",
                            '"': "&quot;",
                            "'": "&#39;"
                        })[m]
                );
            }

            /* ======== History Functions ======== */
            function getFormData() {
                const formState = {};
                const ids = [
                    "shopName",
                    "customerName",
                    "customerPhone",
                    "customerAddress",
                    "orderDate",
                    "expectedDate",
                    "orderId",
                    "paidAmount",
                    "paymentMethod",
                    "shippingFee",
                    "shortNote",
                    "note",
                    "thankYouText"
                ];
                ids.forEach((id) => {
                    const el = $(id);
                    if (el) formState[id] = el.value;
                });
                formState.products = getProducts();
                formState.images = JSON.parse(
                    localStorage.getItem(LS_IMAGES) || "{}"
                );
                formState.theme = localStorage.getItem(LS_THEME) || "theme-1";
                return formState;
            }

            function loadFormData(data) {
                if (!data) return;
                const ids = [
                    "shopName",
                    "customerName",
                    "customerPhone",
                    "customerAddress",
                    "orderDate",
                    "expectedDate",
                    "orderId",
                    "paidAmount",
                    "paymentMethod",
                    "shippingFee",
                    "shortNote",
                    "note",
                    "thankYouText"
                ];
                ids.forEach((id) => {
                    if ($(id) && data[id] !== undefined) $(id).value = data[id];
                });

                if (data.products) {
                    $("productList").innerHTML = "";
                    data.products.forEach((p) => addProduct(p));
                }

                // Ghi đè dữ liệu ảnh toàn cục bằng dữ liệu từ hóa đơn đã lưu
                localStorage.setItem(LS_IMAGES, JSON.stringify(data.images));
                loadImages();

                if (data.theme) {
                    setTheme(data.theme);
                    document.querySelectorAll(".theme-btn").forEach((b) => {
                        if (b.dataset.theme === data.theme)
                            b.classList.add("selected");
                        else b.classList.remove("selected");
                    });
                }
                updateInvoice();
            }

            function saveInvoiceToHistory() {
                const invoiceData = getFormData();
                invoiceData.timestamp = Date.now();

                let history = JSON.parse(
                    localStorage.getItem(LS_HISTORY) || "[]"
                );
                history.unshift(invoiceData);
                localStorage.setItem(LS_HISTORY, JSON.stringify(history));

                renderHistory();
                alert("Đã lưu hóa đơn vào lịch sử.");
            }

            // Hàm hiển thị danh sách hóa đơn đã lưu
            // Hàm hiển thị danh sách hóa đơn đã lưu
            // Hàm hiển thị danh sách hóa đơn đã lưu
            function renderHistory() {
                const history = JSON.parse(
                    localStorage.getItem(LS_HISTORY) || "[]"
                );
                const historyList = $("history-list");
                historyList.innerHTML = "";

                if (history.length === 0) {
                    historyList.innerHTML =
                        "<li>Chưa có hóa đơn nào được lưu.</li>";
                    return;
                }

                history.forEach((inv) => {
                    const li = document.createElement("li");
                    li.classList.add(inv.theme || "theme-1"); // Thêm class theme vào item
                    li.innerHTML = `
            <img class="flower-thumbnail" src="${escapeHtml(
                inv.images.flowerImg
            )}" alt="Decor" style="display: ${
                inv.images.flowerImg ? "block" : "none"
            };">
            
            <div class="invoice-details">
                <span class="history-shop-name">${escapeHtml(
                    inv.customerName || "Đơn hàng"
                )} - ${inv.customerPhone || "Không có SĐT"}</span>
                <span class="history-date">${new Date(
                    inv.timestamp
                ).toLocaleString("vi-VN")}</span>
            </div>
            <div class="invoice-actions">
                <button class="load-btn" data-id="${
                    inv.timestamp
                }">Tải lại</button>
                <button class="delete-btn" data-id="${
                    inv.timestamp
                }">Xóa</button>
            </div>
        `;
                    historyList.appendChild(li);
                });
            }

            function loadInvoiceFromHistory(id) {
                const history = JSON.parse(
                    localStorage.getItem(LS_HISTORY) || "[]"
                );
                const invoiceToLoad = history.find(
                    (inv) => inv.timestamp == id
                );
                if (invoiceToLoad) {
                    loadFormData(invoiceToLoad);
                    alert(`Đã tải lại hóa đơn "${invoiceToLoad.shopName}".`);
                }
            }

            function deleteInvoiceFromHistory(id) {
                let history = JSON.parse(
                    localStorage.getItem(LS_HISTORY) || "[]"
                );
                history = history.filter((inv) => inv.timestamp != id);
                localStorage.setItem(LS_HISTORY, JSON.stringify(history));
                renderHistory();
                alert("Đã xóa hóa đơn khỏi lịch sử.");
            }

            function clearHistory() {
                if (
                    confirm(
                        "Bạn có chắc chắn muốn xóa toàn bộ lịch sử hóa đơn?"
                    )
                ) {
                    localStorage.removeItem(LS_HISTORY);
                    renderHistory();
                    alert("Đã xóa toàn bộ lịch sử.");
                }
            }

            /* ======== Products ======== */
            function createProductElement(p = {}) {
                const el = document.createElement("div");
                el.className = "product-item";
                el.innerHTML = `
                    <input class="productName" placeholder="Tên sản phẩm" value="${escapeHtml(
                        p.name || ""
                    )}">
                    <input class="productQty" placeholder="SL" type="number" min="0" value="${
                        p.qty || ""
                    }">
                    <input class="productPrice" placeholder="Giá (VNĐ)" type="number" min="0" value="${
                        p.price || ""
                    }">
                    <button class="remove-btn" title="Xóa">×</button>
                `;
                el.querySelector(".remove-btn").addEventListener(
                    "click",
                    () => {
                        el.remove();
                        debouncedUpdateInvoice();
                    }
                );
                el.querySelectorAll("input").forEach((i) =>
                    i.addEventListener("input", debouncedUpdateInvoice)
                );
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
                const nodes = document.querySelectorAll(
                    "#productList .product-item"
                );
                const arr = [];
                nodes.forEach((n) => {
                    const name = n.querySelector(".productName").value.trim();
                    const qty =
                        Number(n.querySelector(".productQty").value) || 0;
                    const price =
                        Number(n.querySelector(".productPrice").value) || 0;
                    if (name) arr.push({ name, qty, price });
                });
                return arr;
            }
            function saveProducts() {
                localStorage.setItem(
                    LS_PRODUCTS,
                    JSON.stringify(getProducts())
                );
            }

            /* ======== Form save/load ======== */
            function saveForm() {
                const ids = [
                    "shopName",
                    "customerName",
                    "customerPhone",
                    "customerAddress",
                    "orderDate",
                    "expectedDate",
                    "orderId",
                    "paidAmount",
                    "paymentMethod",
                    "shippingFee",
                    "shortNote",
                    "note",
                    "thankYouText"
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

            /* ======== Images save/load (base64) ======== */
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
                        const imgs = JSON.parse(
                            localStorage.getItem(LS_IMAGES) || "{}"
                        );
                        imgs[storageKey] = data;
                        localStorage.setItem(LS_IMAGES, JSON.stringify(imgs));
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
                        // Bỏ chọn ảnh có sẵn khi người dùng upload ảnh mới
                        if (storageKey === "flowerImg") {
                            originalFlowerImageSrc = data;
                            document
                                .querySelectorAll(".predefined-flower-img")
                                .forEach((img) => {
                                    img.style.border = "2px solid transparent";
                                });
                        }
                    } catch (error) {
                        console.error("Lỗi khi tải file:", error);
                        indicator.textContent =
                            "Lỗi khi tải file. Vui lòng thử lại.";
                        indicator.className = "upload-indicator error";
                        input.value = "";
                    }
                });
            }

            /* ======== Form save/load ======== */
            function loadFormData(data) {
                if (!data) return;
                const ids = [
                    "shopName",
                    "customerName",
                    "customerPhone",
                    "customerAddress",
                    "orderDate",
                    "expectedDate",
                    "orderId",
                    "paidAmount",
                    "paymentMethod",
                    "shippingFee",
                    "shortNote",
                    "note",
                    "thankYouText"
                ];
                ids.forEach((id) => {
                    if ($(id) && data[id] !== undefined) $(id).value = data[id];
                });

                if (data.products) {
                    $("productList").innerHTML = "";
                    data.products.forEach((p) => addProduct(p));
                }

                // Ghi đè dữ liệu ảnh toàn cục bằng dữ liệu từ hóa đơn đã lưu.
                // Nếu không có, `data.images` sẽ là một object rỗng.
                localStorage.setItem(
                    LS_IMAGES,
                    JSON.stringify(data.images || {})
                );
                loadImages();

                if (data.theme) {
                    setTheme(data.theme);
                    document.querySelectorAll(".theme-btn").forEach((b) => {
                        if (b.dataset.theme === data.theme)
                            b.classList.add("selected");
                        else b.classList.remove("selected");
                    });
                }
                updateInvoice();
            }

            function loadImages() {
                const imgs = JSON.parse(
                    localStorage.getItem(LS_IMAGES) || "{}"
                );

                // Cập nhật logo
                const outLogo = $("outLogo");
                if (outLogo) {
                    if (imgs.shopLogo) {
                        outLogo.src = imgs.shopLogo;
                        outLogo.style.display = "block";
                    } else {
                        outLogo.src = "";
                        outLogo.style.display = "none";
                    }
                }

                // Xử lý ảnh decor góc
                if (imgs.flowerImg) {
                    originalFlowerImageSrc = imgs.flowerImg;
                    if ($("flowerTL")) {
                        $("flowerTL").src = imgs.flowerImg;
                        $("flowerTL").style.display = "block";
                    }
                    if ($("flowerBR")) {
                        $("flowerBR").src = imgs.flowerImg;
                        $("flowerBR").style.display = "block";
                    }
                    document
                        .querySelectorAll(".predefined-flower-img")
                        .forEach((img) => {
                            if (
                                img.getAttribute("data-image") ===
                                imgs.flowerImg
                            ) {
                                img.style.border = "2px solid var(--accent)";
                            } else {
                                img.style.border = "2px solid transparent";
                            }
                        });
                } else {
                    if ($("flowerTL")) $("flowerTL").style.display = "none";
                    if ($("flowerBR")) $("flowerBR").style.display = "none";
                    document
                        .querySelectorAll(".predefined-flower-img")
                        .forEach((img) => {
                            img.style.border = "2px solid transparent";
                        });
                }

                // Cập nhật hoa ở nền hero section

                // Cập nhật QR Code
                const outQr = $("outQr");
                if (outQr) {
                    if (imgs.qrImg) {
                        outQr.src = imgs.qrImg;
                        outQr.style.display = "block";
                    } else {
                        outQr.src = "";
                        outQr.style.display = "none";
                    }
                }
            }

            /* ======== Form save/load ======== */
            function loadFormData(data) {
                if (!data) return;
                const ids = [
                    "shopName",
                    "customerName",
                    "customerPhone",
                    "customerAddress",
                    "orderDate",
                    "expectedDate",
                    "orderId",
                    "paidAmount",
                    "paymentMethod",
                    "shippingFee",
                    "shortNote",
                    "note",
                    "thankYouText"
                ];
                ids.forEach((id) => {
                    if ($(id) && data[id] !== undefined) $(id).value = data[id];
                });

                if (data.products) {
                    $("productList").innerHTML = "";
                    data.products.forEach((p) => addProduct(p));
                }

                // Ghi đè dữ liệu ảnh toàn cục bằng dữ liệu từ hóa đơn đã lưu.
                // Nếu không có, `data.images` sẽ là một object rỗng.
                localStorage.setItem(
                    LS_IMAGES,
                    JSON.stringify(data.images || {})
                );
                loadImages();

                if (data.theme) {
                    setTheme(data.theme);
                    document.querySelectorAll(".theme-btn").forEach((b) => {
                        if (b.dataset.theme === data.theme)
                            b.classList.add("selected");
                        else b.classList.remove("selected");
                    });
                }
                updateInvoice();
            }

            /* ======== Events init ======== */
            document.addEventListener("DOMContentLoaded", () => {
                // Kiểm tra và đặt ảnh hoa mặc định nếu chưa có trong localStorage
                let imgs = JSON.parse(localStorage.getItem(LS_IMAGES) || "{}");
                if (!imgs.flowerImg) {
                    imgs.flowerImg = "assets/uploads/transparent.png";
                    localStorage.setItem(LS_IMAGES, JSON.stringify(imgs));
                }

                // load saved
                loadForm();
                loadProducts();
                loadImages();
                setMonthlyDecor();
                loadTheme();
                renderHistory(); // Tải lịch sử khi trang được load
                updateInvoice();

                // input live update
                document
                    .querySelectorAll(
                        '#invoiceForm input:not([type="file"]), #invoiceForm textarea, #invoiceForm select'
                    )
                    .forEach((inp) =>
                        inp.addEventListener("input", debouncedUpdateInvoice)
                    );

                // file uploads (store base64)
                handleImageUpload("shopLogo", ["outLogo"], "shopLogo");
                handleImageUpload(
                    "flowerImage",
                    ["flowerTL", "flowerBR"],
                    "flowerImg"
                );
                handleImageUpload("qrImage", ["outQr"], "qrImg");

                // add/clear product
                $("addProductBtn").addEventListener("click", () => {
                    addProduct({});
                });
                $("clearProducts").addEventListener("click", () => {
                    if (confirm("Xóa hết sản phẩm?")) {
                        clearProducts();
                    }
                });

                // save/reset
                $("saveBtn").addEventListener("click", () => {
                    saveForm();
                    saveProducts();
                    alert("Đã lưu vào trình duyệt.");
                });
                $("resetBtn").addEventListener("click", () => {
                    if (confirm("Reset toàn bộ dữ liệu?")) {
                        // Chỉ xóa các khóa liên quan đến form, không xóa lịch sử
                        localStorage.removeItem(LS_FORM);
                        localStorage.removeItem(LS_PRODUCTS);
                        localStorage.removeItem(LS_IMAGES);
                        localStorage.removeItem(LS_THEME);
                        location.reload();
                    }
                });

                // Lịch sử đơn hàng
                $("saveToHistoryBtn").addEventListener(
                    "click",
                    saveInvoiceToHistory
                );
                $("clearHistoryBtn").addEventListener("click", clearHistory);
                $("history-list").addEventListener("click", (event) => {
                    const target = event.target;
                    const id = target.getAttribute("data-id");
                    if (target.classList.contains("load-btn")) {
                        loadInvoiceFromHistory(id);
                    } else if (target.classList.contains("delete-btn")) {
                        if (confirm("Bạn có muốn xóa hóa đơn này không?")) {
                            deleteInvoiceFromHistory(id);
                        }
                    }
                });

                // theme buttons
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
                document
                    .querySelectorAll(".predefined-flower-img")
                    .forEach((btn) => {
                        btn.addEventListener("click", () => {
                            const imagePath = btn.getAttribute("data-image");
                            const imgs = JSON.parse(
                                localStorage.getItem(LS_IMAGES) || "{}"
                            );
                            imgs.flowerImg = imagePath;
                            originalFlowerImageSrc = imagePath;
                            setDecorImageFromPath(imagePath);
                            localStorage.setItem(
                                LS_IMAGES,
                                JSON.stringify(imgs)
                            );
                            // Gọi lại loadImages để cập nhật cả hero section và invoice
                            loadImages();
                        });
                    });

                // download (safe)
                $("downloadBtn").addEventListener("click", async () => {
                    const btn = $("downloadBtn");

                    btn.disabled = true;
                    btn.textContent = "Đang tạo ảnh...";
                    try {
                        // wait images inside card to load (logo/flower/qr)
                        const imgs = Array.from(
                            document.querySelectorAll("#card img")
                        );
                        await Promise.all(
                            imgs.map(
                                (img) =>
                                    new Promise((resolve) => {
                                        if (!img.src) return resolve();
                                        if (img.complete) return resolve();
                                        img.onload = () => resolve();
                                        img.onerror = () => resolve();
                                    })
                            )
                        );

                        // compute safe scale: don't exceed 3 to avoid memory spikes
                        const card = $("card");
                        const origWidth = card.clientWidth || 360;
                        const targetWidth = 1080;
                        let scale = Math.min(
                            3,
                            Math.max(1.5, targetWidth / origWidth)
                        );
                        // render with html2canvas
                        const canvas = await html2canvas(card, {
                            useCORS: true,
                            scale: scale,
                            backgroundColor: null
                        });
                        // export via blob to avoid huge dataURL memory peak
                        canvas.toBlob(
                            (blob) => {
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `invoice_${
                                    $("orderId").value || "order"
                                }.png`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                setTimeout(
                                    () => URL.revokeObjectURL(url),
                                    10000
                                );
                            },
                            "image/png",
                            0.95
                        );

                        // Gọi hàm để lưu hóa đơn vào lịch sử sau khi tải xong
                        saveInvoiceToHistory();
                    } catch (err) {
                        console.error(err);
                        alert("Có lỗi khi tạo ảnh. Thử lại nhé.");
                    } finally {
                        btn.disabled = false;
                        btn.textContent = "📥 Tải hóa đơn (PNG)";
                    }
                });
            }); // end DOMContentLoaded

            /* ======== Form save/load ======== */
            function loadFormData(data) {
                if (!data) return;
                const ids = [
                    "shopName",
                    "customerName",
                    "customerPhone",
                    "customerAddress",
                    "orderDate",
                    "expectedDate",
                    "orderId",
                    "paidAmount",
                    "paymentMethod",
                    "shippingFee",
                    "shortNote",
                    "note",
                    "thankYouText"
                ];
                ids.forEach((id) => {
                    if ($(id) && data[id] !== undefined) $(id).value = data[id];
                });

                if (data.products) {
                    $("productList").innerHTML = "";
                    data.products.forEach((p) => addProduct(p));
                }

                // Ghi đè dữ liệu ảnh toàn cục bằng dữ liệu từ hóa đơn đã lưu.
                // Nếu không có, `data.images` sẽ là một object rỗng.
                localStorage.setItem(
                    LS_IMAGES,
                    JSON.stringify(data.images || {})
                );
                loadImages();

                if (data.theme) {
                    setTheme(data.theme);
                    document.querySelectorAll(".theme-btn").forEach((b) => {
                        if (b.dataset.theme === data.theme)
                            b.classList.add("selected");
                        else b.classList.remove("selected");
                    });
                }
                updateInvoice();
            }

            /* ======== Theme ======== */
            function setTheme(cls) {
                document.body.classList.remove(
                    "theme-0",
                    "theme-1",
                    "theme-2",
                    "theme-3",
                    "theme-4",
                    "theme-5",
                    "theme-6",
                    "theme-7",
                    "theme-8"
                );
                document.body.classList.add(cls);
                localStorage.setItem(LS_THEME, cls);
            }

            function loadTheme() {
                const t = localStorage.getItem(LS_THEME) || "theme-1";
                setTheme(t);
                document.querySelectorAll(".theme-btn").forEach((b) => {
                    if (b.dataset.theme === t) b.classList.add("selected");
                    else b.classList.remove("selected");
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

            /* ======== Update preview ======== */
            function updateInvoice() {
                $("outShopName").innerText =
                    $("shopName").value.trim() || "Shop Của Tôi";
                $("outCustomerName").innerText =
                    $("customerName").value.trim() || "Tên khách hàng";
                $("outCustomerPhone").innerText =
                    $("customerPhone").value.trim() || "SĐT";
                $("outCustomerAddress").innerText =
                    $("customerAddress").value.trim() || "Địa chỉ nhận";
                $("outOrderDate").innerText =
                    $("orderDate").value || "__/__/____";
                $("outExpectedDate").innerText =
                    $("expectedDate").value || "__/__/____";
                $("outOrderId").innerText =
                    $("orderId").value.trim() || "Mã đơn";
                $("outPaymentMethod").innerText =
                    $("paymentMethod").value || "Tiền mặt";
                $("outShortNote").innerText = $("shortNote").value.trim() || "";
                $("outThank").innerText =
                    $("thankYouText").value.trim() ||
                    "Cảm ơn anh/chị đã tin tưởng ủng hộ Shop!";

                const prods = getProducts();
                const out = $("outProducts");
                out.innerHTML = "";
                let total = 0;
                if (prods.length === 0) {
                    out.innerHTML =
                        '<div style="text-align:center;color:var(--muted);padding:8px">Không có sản phẩm</div>';
                } else {
                    const frag = document.createDocumentFragment();
                    const row = document.createElement("div");
                    row.className = "callout prod-row";
                    row.style = "color: var(--accent)";
                    row.innerHTML = `<div style="flex:1">
                            Sản phẩm
                      
                        </div><div style="width:24px;text-align:right">
                            SL
                        </div><div style="width:90px;text-align:right">
                            Đơn giá
                        </div><div style="width:90px;text-align:right">
                            Thành tiền
                        </div>`;
                    frag.appendChild(row);
                    prods.forEach((p) => {
                        const subtotal = p.qty * p.price;
                        total += subtotal;
                        const row = document.createElement("div");
                        row.className = "prod-row";
                        row.innerHTML = `<div style="flex:1">${escapeHtml(
                            p.name
                        )}</div><div style="width:24px;text-align:right">${
                            p.qty
                        }</div><div style="width:90px;text-align:right">${toCurrency(
                            p.price
                        )} ₫</div><div style="width:90px;text-align:right">${toCurrency(
                            subtotal
                        )} ₫</div>`;
                        frag.appendChild(row);
                    });
                    out.appendChild(frag);
                }
                const shipping = Number($("shippingFee").value) || 0;
                if (shipping > 0) {
                    const r = document.createElement("div");
                    r.className = "prod-row";
                    r.innerHTML = `<div style="flex:1">Phí ship</div><div style="width:36px"></div><div style="width:90px;text-align:right"></div><div style="width:110px;text-align:right">${toCurrency(
                        shipping
                    )} ₫</div>`;
                    out.appendChild(r);
                    total += shipping;
                }
                $("outTotal").innerText = toCurrency(total) + " ₫";
                $("outPaidAmount").innerText =
                    toCurrency($("paidAmount").value) + " ₫";
            }

            /* ======== Save/load products & form on start ======== */
            function loadProducts() {
                const arr = JSON.parse(
                    localStorage.getItem(LS_PRODUCTS) || "[]"
                );
                $("productList").innerHTML = "";
                if (!arr || arr.length === 0) {
                    addProduct({
                        name: "B.Begin Non-Alcohol Perfume",
                        qty: 1,
                        price: 1200000
                    });
                } else arr.forEach((p) => addProduct(p));
            }
        