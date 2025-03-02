// Extract YAML metadata from markdown content
function extractMetadata(markdown) {
    const yamlRegex = /^---\n([\s\S]+?)\n---\n/;
    const match = markdown.match(yamlRegex);
    let metadata = {};
    let content = markdown;

    if (match) {
        metadata = parseYAML(match[1]);
        content = markdown.replace(yamlRegex, "").trim();
    }

    return { metadata, content };
}

// Parse YAML content to JavaScript object
function parseYAML(yamlText) {
    const lines = yamlText.split("\n");
    const result = {};

    for (const line of lines) {
        if (!line.trim()) continue; // Skip empty lines

        const colonIndex = line.indexOf(': ');
        if (colonIndex === -1) continue; // Skip invalid lines

        const key = line.substring(0, colonIndex).trim();
        let val = line.substring(colonIndex + 2).trim();

        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }

        // Handle arrays
        if (val.startsWith("[") && val.endsWith("]")) {
            try {
                val = JSON.parse(val.replace(/'/g, '"'));
            } catch (error) {
                console.warn("Error parsing YAML array:", error);
                val = [];
            }
        }

        result[key] = val;
    }

    return result;
}

/**
 * Generate Table of Contents (TOC) from post content
 */
function generateTOC() {
    const postContent = document.getElementById("post-content");
    const tocContainer = document.getElementById("post-toc");

    if (!postContent || !tocContainer) return;

    const headers = postContent.querySelectorAll("h2, h3");
    if (headers.length === 0) {
        tocContainer.style.display = "none";
        return;
    }

    // Create TOC structure with document fragment for better performance
    const fragment = document.createDocumentFragment();
    const heading = document.createElement("h3");
    heading.textContent = "Nội dung chính";
    fragment.appendChild(heading);

    const tocList = document.createElement("ul");
    let lastH2Item = null;
    let currentSubList = null;

    headers.forEach((header, index) => {
        const id = `section-${index}`;
        header.id = id;

        const listItem = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${id}`;
        link.textContent = header.textContent;
        listItem.appendChild(link);

        if (header.tagName === "H2") {
            currentSubList = document.createElement("ul");
            listItem.appendChild(currentSubList);
            tocList.appendChild(listItem);
            lastH2Item = listItem;
        } else if (header.tagName === "H3" && lastH2Item && currentSubList) {
            currentSubList.appendChild(listItem);
        } else {
            tocList.appendChild(listItem);
        }
    });

    fragment.appendChild(tocList);

    // Clear and append in one operation
    tocContainer.innerHTML = "";
    tocContainer.appendChild(fragment);
    tocContainer.style.display = "block";
}

/**
 * Toggle dark mode and save preference
 */
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");

    // Save state to localStorage
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("darkMode", "enabled");
    } else {
        localStorage.setItem("darkMode", "disabled");
    }
}

/**
 * Setup Fuse.js for search functionality
 */
function setupFuse(posts) {
    if (!window.Fuse) {
        console.warn("Fuse.js not loaded");
        return null;
    }

    return new Fuse(posts, {
        keys: ["title", "tags", "description"],
        includeScore: true,
        threshold: 0.3
    });
}

/**
 * Initialize lazy loading for images
 */
function lazyLoadImages() {
    // Fallback for browsers without IntersectionObserver
    if (!('IntersectionObserver' in window)) {
        const lazyImages = document.querySelectorAll('.lazy');
        lazyImages.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.classList.remove("lazy", "skeleton");
            }
        });
        return;
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.classList.remove("lazy", "skeleton");
                    img.onload = () => {
                        img.classList.remove("skeleton-image");
                    };
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: "100px 0px",
        threshold: 0.01
    });

    document.querySelectorAll('.lazy').forEach(img => {
        try {
            imageObserver.observe(img);
        } catch (e) {
            console.warn("Error observing image:", e);
        }
    });
}

/**
 * Debounce function to limit frequent calls
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Toast notification system
const toastQueue = [];
let toastProcessing = false;

function log(message, type = "") {
    if (!message) return;

    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    // Add toast to queue
    toastQueue.push({ message, type });

    // Start processing if not already running
    if (!toastProcessing) {
        processToastQueue();
    }
}

function processToastQueue() {
    if (toastQueue.length === 0) {
        toastProcessing = false;
        return;
    }

    toastProcessing = true;
    const { message, type } = toastQueue.shift();

    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // Set icon based on type
    let icon;
    switch (type) {
        case "error": icon = "⛔"; break;
        case "success": icon = "✅"; break;
        default: icon = "ℹ️";
    }

    toast.textContent = `${icon} ${message}`;
    toastContainer.appendChild(toast);

    // Animate and remove toast
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.remove();
            processToastQueue(); // Process next toast
        }, 500);
    }, 3000);
}

function FrontMatter(markdown){
  const {metadata, content} = extractMetadata(markdown);
  return content; // Return only the content without the front matter
}

/**
 * Handle post detail page functionality
 */
async function handlePostPage() {
    const postContent = document.getElementById("post-content");
    if (!postContent) return;

    const params = new URLSearchParams(window.location.search);
    const postFile = params.get("post");

    if (!postFile) {
        postContent.innerHTML = "<p class='error-message'>Bài viết không tồn tại.</p>";
        return;
    }

    try {
        // Configure marked options
        if (window.marked) {
            marked.setOptions({
                breaks: true,
                smartLists: true,
                smartypants: true,
                gfm: true,
                renderer: new marked.Renderer(),
                highlight: function(code, lang) {
                    if (window.hljs && lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return window.hljs ? hljs.highlightAuto(code).value : code;
                }
            });
        } else {
            console.warn("Marked.js library not loaded");
        }

        const response = await fetch(`/posts/${postFile}.md`);

        if (!response.ok) {
            postContent.innerHTML = `<p class='error-message'>Lỗi: Không thể tải bài viết (${response.status})</p>`;
            return;
        }

        const markdown = await response.text();
        //log(markdown)
        if (markdown.startsWith("<!DOCTYPE html>")) {
            postContent.innerHTML = "<p class='error-message'>Lỗi: Tải nhầm file HTML thay vì Markdown.</p>";
            return;
        }

        const { metadata, content } = extractMetadata(markdown);
        showSuggestions(postFile, metadata.tags)

        // Set post metadata
        document.title = `${metadata.title || "Bài viết"} - Minimalist Blog`;
        document.getElementById("post-title").textContent = metadata.title || "Unknown";
        document.getElementById("post-author").textContent = metadata.author || "Unknown";
        document.getElementById("post-date").textContent = metadata.date || "Unknown";

        // Set post image with fallback
        const postImage = document.getElementById("post-image");
        if (postImage) {
            postImage.src = metadata.image || "/assets/uploads/default.jpg";
            postImage.alt = metadata.title || "Post image";
            postImage.onerror = function() {
                this.src = "/assets/uploads/default.jpg";
                this.onerror = null;
            postImage.classList.add("lazy")
            };
        }

        // Set tags
        const tagsContainer = document.getElementById("post-tags");
        if (tagsContainer && metadata.tags && Array.isArray(metadata.tags)) {
            tagsContainer.innerHTML = metadata.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join("");
        }

        // Render markdown content
        if (window.marked) {
            postContent.innerHTML = marked.parse(FrontMatter(markdown)); // Use FrontMatter function here
        } else {
            postContent.innerHTML = `<pre>${content}</pre>`;
        }

        // Highlight code blocks
        if (window.hljs) {
            document.querySelectorAll("pre code").forEach(block => {
                hljs.highlightElement(block);
            });
        }

        // Generate TOC
        
        generateTOC();

    } catch (error) {
        console.error("Error loading post:", error);
        postContent.innerHTML = `<p class='error-message'>Lỗi: ${error.message}</p>`;
    }
    lazyLoadImages();
}

/**
 * Handle index page functionality
 */
async function handleIndexPage() {
    const blogList = document.getElementById("post-list");
    const featuredList = document.getElementById("featured-list");
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");

    if (!blogList || !searchInput || !categoryFilter) return;

    let posts = [];
    let fuse;

    // Show loading state
    blogList.innerHTML = `
        <div class="loading-skeleton">
            ${Array(6).fill(`
                <article>
                    <div class="skeleton skeleton-image"></div>
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text"></div>
                </article>
            `).join('')}
        </div>
    `;

    try {
        // Fetch post list
        const response = await fetch("posts.json");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const postsData = await response.json();

        // Sort and filter posts
        posts = postsData
            .filter(post => post.status === "published")
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Setup search
        fuse = setupFuse(posts);

        // Populate category dropdown
        const uniqueTags = new Set();
        posts.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
                post.tags.forEach(tag => uniqueTags.add(tag));
            }
        });

        const fragment = document.createDocumentFragment();
        uniqueTags.forEach(tag => {
            const option = document.createElement("option");
            option.value = tag;
            option.textContent = tag;
            fragment.appendChild(option);
        });
        categoryFilter.appendChild(fragment);

        // Render posts
        
    /*  
        
      const params = new URLSearchParams(window.location.search);
      const selectedTag = params.get("tag");

    if (selectedTag) {
        filterPostsByTag(posts,selectedTag);
        renderFeaturedPosts(posts);
    } else {
        handleIndexPage(posts); // Load toàn bộ bài viết như bình thường
        renderFeaturedPosts(posts);
    }
    */


function filterPostsByTag(posts, tag) {
    const filteredPosts = posts.filter(post => post.tags.includes(tag));
    renderPosts(filteredPosts);
    log(`🔍 Hiển thị bài viết có tag: #${tag}`, "info");
}
 
       renderPosts(posts);

        // Featured posts
        renderFeaturedPosts(posts);

    } catch (error) {
        console.error("Error loading posts:", error);
        blogList.innerHTML = `<p class='error-message'>Lỗi khi tải danh sách bài viết: ${error.message}</p>`;
    }

    // Set up event listeners
    searchInput.addEventListener("input", debounce(() => {
        if (fuse) {
            const searchTerm = searchInput.value.trim();

            if (!searchTerm) {
                renderPosts(posts);
                return;
            }

            const results = fuse.search(searchTerm).map(result => result.item);
            renderPosts(results);
        }
    }, 300));

    categoryFilter.addEventListener("change", () => {
        const selectedCategory = categoryFilter.value;

        if (selectedCategory === "all") {
            renderPosts(posts);
            return;
        }

        const filtered = posts.filter(post => 
            post.tags && Array.isArray(post.tags) && 
            post.tags.includes(selectedCategory)
        );

        renderPosts(filtered);
    });

    // Display featured posts
    function renderFeaturedPosts(allPosts) {
        if (!featuredList) return;

        const featuredPosts = allPosts
            .filter(post => post.featured === "true")
            .slice(0, 1);

        if (featuredPosts.length > 0) {
            featuredList.innerHTML = featuredPosts.map(post => `
                <article class="featured">
                    <img class="lazy" data-src="${post.image}" alt="${post.title}"/>
                    <h3><a href="post.html?post=${post.slug}">${post.title}</a></h3>
                    <p>${post.description}</p>
                </article>
            `).join("");
        } else {
            featuredList.innerHTML = "<p>Chưa có bài viết nổi bật.</p>";
        }
        
        lazyLoadImages();
    }

    // Render post list
    function renderPosts(filteredPosts) {
        if (!blogList) return;

        if (filteredPosts.length === 0) {
            blogList.innerHTML = "<p class='no-results'>Không tìm thấy bài viết nào.</p>";
            return;
        }

        blogList.innerHTML = filteredPosts.map(post => `
            <article>
                <img class="lazy" data-src="${post.image}" alt="${post.title}"/>
                <h2><a href="post.html?post=${post.slug}">${post.title}</a></h2>
                <p class="text-small"><strong>Ngày đăng:</strong> ${post.date}</p>
                <p>${post.description}</p>
            </article>
        `).join("");
        
        document.getElementById("totalPosts").innerHTML = filteredPosts.length;
        lazyLoadImages();
    }
}


function stickyHeader () {
    const header = document.querySelector(".main-header");
    let lastScrollY = window.scrollY;
    let hidden = false;

    window.addEventListener("scroll", function () {
        const currentScrollY = window.scrollY;
        const headerHeight = header.offsetHeight;

        if (currentScrollY > lastScrollY && currentScrollY > headerHeight * 1.5) {
            // Chỉ ẩn khi cuộn xuống và đã cuộn qua 1.5 lần chiều cao header
            if (!hidden) {
                header.classList.add("hidden");
                hidden = true;
            }
        } else if (currentScrollY < lastScrollY || currentScrollY < headerHeight) {
            // Hiện lại khi cuộn lên hoặc ở đầu trang
            if (hidden) {
                header.classList.remove("hidden");
                hidden = false;
            }
        }

        lastScrollY = currentScrollY;
    });
}

function scrollIndicator() {

    const scrollIndicator = document.getElementById("scroll-indicator");

    window.addEventListener("scroll", function () {
        const scrollTop = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        scrollIndicator.style.width = scrollPercent + "%";
    });

  
}

// Initialize on DOM content loaded
document.addEventListener("DOMContentLoaded", function() {
  
    stickyHeader();
    scrollIndicator();
  
    try {
        // Apply dark mode if enabled
        if (localStorage.getItem("darkMode") === "enabled") {
            document.body.classList.add("dark-mode");
        }

        // Register dark mode toggle event
        const darkModeToggle = document.getElementById("darkModeToggle");
        if (darkModeToggle) {
            darkModeToggle.addEventListener("click", toggleDarkMode);
        }

        // Handle post detail page
        handlePostPage();
       // fetchSuggestedRecipes(metadata);
        // Handle index page
        handleIndexPage();

    } catch (error) {
        console.error("Initialization error:", error);
    }
});



async function suggestRecipes(currentSlug, currentTags) {
    const response = await fetch("posts.json");
    const posts = await response.json();
    // Lọc bài khác bài hiện tại
    const relatedPosts = posts
        .filter(post => post.slug !== currentSlug)
        .map(post => ({
            ...post,
            matchScore: post.tags.filter(tag => currentTags.includes(tag)).length
        }))
        .filter(post => post.matchScore > 0) // Chỉ lấy bài có tag trùng
        .sort((a, b) => b.matchScore - a.matchScore) // Sắp xếp theo độ liên quan
    return relatedPosts.slice(0, 4); // Trả về tối đa 3 món ăn liên quan
}


async function showSuggestions(slug, tags) {
    const suggestions = await suggestRecipes(slug, tags);
    const container = document.getElementById("suggested-list");
    
    container.innerHTML = suggestions.length
        ? suggestions.map(post => `
            <div class="suggested-item">
                <img src="${post.image}" alt="${post.title}">
                <p><a href="post.html?post=${post.slug}">${post.title}</a></p>
            </div>`).join("")
        : "<p>Không có món nào gợi ý.</p>";
}

document.addEventListener("DOMContentLoaded", function () {
    const bookmarkButtons = document.querySelectorAll(".bookmark-btn");
    const bookmarkToggle = document.getElementById("bookmark-toggle");

    function getBookmarks() {
        return JSON.parse(localStorage.getItem("bookmarks")) || [];
    }

    function saveBookmark(slug, title) {
        let bookmarks = getBookmarks();
        if (!bookmarks.some(post => post.slug === slug)) {
            bookmarks.push({ slug, title });
            localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
        }
    }

    function removeBookmark(slug) {
        let bookmarks = getBookmarks();
        bookmarks = bookmarks.filter(post => post.slug !== slug);
        localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
    }

    function updateButtonState(button, slug) {
        const bookmarks = getBookmarks();
        if (bookmarks.some(post => post.slug === slug)) {
            button.classList.add("saved");
            button.textContent = "✅ Đã lưu";
        } else {
            button.classList.remove("saved");
            button.textContent = "⭐ Lưu";
        }
    }

    // Xử lý bookmark trong danh sách bài viết
    bookmarkButtons.forEach(button => {
        const slug = button.dataset.slug;
        updateButtonState(button, slug);
        button.addEventListener("click", function () {
            if (this.classList.contains("saved")) {
                removeBookmark(slug);
            } else {
                saveBookmark(slug, this.closest("article").querySelector("h2 a").textContent);
            }
            updateButtonState(this, slug);
        });
    });

    // Xử lý bookmark trong trang chi tiết bài viết
    if (bookmarkToggle) {
        const postSlug = new URLSearchParams(window.location.search).get("post");
        updateButtonState(bookmarkToggle, postSlug);

        bookmarkToggle.addEventListener("click", function () {
            if (this.classList.contains("saved")) {
                removeBookmark(postSlug);
            } else {
                saveBookmark(postSlug, document.getElementById("post-title").textContent);
            }
            updateButtonState(this, postSlug);
        });
    }
});


document.getElementById("invoice-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const customerName = document.getElementById("customer-name").value;
    const phone = document.getElementById("phone").value;
    const address = document.getElementById("address").value;
    const product = document.getElementById("product").value;
    const price = parseFloat(document.getElementById("price").value);
    const quantity = parseInt(document.getElementById("quantity").value);
    const shipping = parseFloat(document.getElementById("shipping").value);
    const discount = parseFloat(document.getElementById("discount").value);

    const subtotal = price * quantity;
    const total = subtotal + shipping - discount;

    document.getElementById("invoice").innerHTML = `
        <div class="invoice-header">
            HÓA ĐƠN TẠM TÍNH
        </div>
        <p><strong>Mã đơn:</strong> QFGJQX - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        <p><strong>Khách:</strong> ${customerName}</p>
        <p><strong>ĐT:</strong> ${phone}</p>
        <p><strong>Địa chỉ:</strong> ${address}</p>
        <div class="invoice-content">
            <p><strong>Sản phẩm:</strong> ${product}</p>
            <p><strong>Đơn giá:</strong> ${price.toLocaleString()} đ</p>
            <p><strong>Số lượng:</strong> x${quantity}</p>
            <hr>
            <p><strong>Tạm tính:</strong> ${subtotal.toLocaleString()} đ</p>
            <p><strong>Phí vận chuyển:</strong> ${shipping.toLocaleString()} đ</p>
            <p><strong>Giảm giá:</strong> -${discount.toLocaleString()} đ</p>
        </div>
        <div class="invoice-footer">
            <p><strong>Tổng cộng:</strong> ${total.toLocaleString()} đ</p>
            <p><strong>Chưa thanh toán:</strong> ${total.toLocaleString()} đ</p>
            <hr>
            <p>Thanh toán tiền mặt hoặc chuyển khoản</p>
            <p><strong>Ngân hàng TMCP Quân Đội - 0879269588</strong></p>
            <p><strong>DUONG VAN PHI</strong></p>
        </div>
    `;

    document.getElementById("invoice-container").style.display = "block";
});

document.getElementById("download-btn").addEventListener("click", function () {
    html2canvas(document.getElementById("invoice")).then(canvas => {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "hoa_don.png";
        link.click();
    });
});