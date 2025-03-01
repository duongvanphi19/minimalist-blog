
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
                // console.warn("Error parsing YAML array:", error);
                val = [];
            }
        }

        result[key] = val;
    }
    
    return result;
}

/**
 * Tạo Table of Contents (TOC) từ nội dung bài viết.
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

    // Create the TOC structure using document fragment for better performance
    const fragment = document.createDocumentFragment();
    const heading = document.createElement("h2");
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
        }
    });

    fragment.appendChild(tocList);
    
    // Clear and append in one operation
    tocContainer.innerHTML = "";
    tocContainer.appendChild(fragment);
    tocContainer.style.display = "block";
}

// Gọi hàm generateTOC() sau khi bài viết được load
function showExam(){
  document.getElementById("post-content").innerHTML = marked.parse(
`
# title
## Chương 1  
### Chuong 1.1
    `)
    
}
//posts
document.addEventListener("DOMContentLoaded", async function () {
    // Apply dark mode if enabled
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }
    
    // Post-specific code - only run if we're on a post page
    const postContent = document.getElementById("post-content");
    if (!postContent) return;
    
    const params = new URLSearchParams(window.location.search);
    const postFile = params.get("post");
    
    if (!postFile) {
        postContent.innerHTML = "<p>Bài viết không tồn tại.</p>";
        return;
    }
    
    // Configure marked options once
    marked.setOptions({
        breaks: true,
        smartLists: true,
        smartypants: true,
        gfm: true,
        renderer: new marked.Renderer(),
        highlight: function (code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        }
    });
    
    try {
        const response = await fetch(`/posts/${postFile}.md`);
        
        if (!response.ok) {
            postContent.innerHTML = `<p>Lỗi: Không thể tải bài viết (${response.status})</p>`;
            return;
        }
        
        const markdown = await response.text();
        
        if (markdown.startsWith("<!DOCTYPE html>")) {
            postContent.innerHTML = "<p>Lỗi: Tải nhầm file HTML thay vì Markdown.</p>";
            return;
        }
        
        const { metadata, content } = extractMetadata(markdown);
        
        // Set post metadata
        document.getElementById("post-title").innerHTML = metadata.title || "Unknown";
        document.getElementById("post-author").innerHTML = metadata.author || "Unknown";
        document.getElementById("post-date").innerHTML = metadata.date || "Unknown";
        document.getElementById("post-image").src = metadata.image || "/assets/uploads/default.jpg";
        
        // Render markdown content
        postContent.innerHTML = marked.parse(content);
        
        // Highlight code blocks
        document.querySelectorAll("pre code").forEach(block => {
            hljs.highlightElement(block);
        });
        
        // Generate table of contents
        generateTOC();
        
    } catch (error) {
        postContent.innerHTML = `<p>Lỗi: ${error.message}</p>`;
    }
});

// Hàm chuyển đổi Dark Mode
// Hàm chuyển đổi Dark Mode
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  // Lưu trạng thái trong localStorage
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("darkMode", "enabled");
  } else {
    localStorage.setItem("darkMode", "disabled");
  }
}

// Đăng ký sự kiện cho nút toggle
document.getElementById("darkModeToggle").addEventListener("click", toggleDarkMode);

async function loadPosts() {
  log("load posts");
  const response = await fetch("/posts/");
  const data = await response.json();
  const a = await response.text();
  log(data);
  log(a);
}

function setupFuse(posts){
  return new Fuse(posts,
  {
    keys: ["title", "tags", "description"],
    includeScore: true,
    threhold: 0.3
  }
  )
}
//index
document.addEventListener("DOMContentLoaded", async function () {
    // Only run this code on the index page
    const blogList = document.getElementById("post-list");
    const featuredList = document.getElementById("featured-list");
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");

    if (!blogList || !searchInput || !categoryFilter) {
        return; // Not on index page
    }
    
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
        
        // Extract unique tags for category filter
        const uniqueTags = new Set();
        posts.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
                post.tags.forEach(tag => uniqueTags.add(tag));
            }
        });
        
        // Populate category dropdown
        const fragment = document.createDocumentFragment();
        uniqueTags.forEach(tag => {
            const option = document.createElement("option");
            option.value = tag;
            option.textContent = tag;
            fragment.appendChild(option);
        });
        categoryFilter.appendChild(fragment);
        
        // Display posts
        renderPosts(posts);
        
        // Featured posts
        renderFeaturedPosts(posts);
        
        // Setup event listeners
        searchInput.addEventListener("input", debounce(fuseSearchPosts, 300));
        categoryFilter.addEventListener("change", filterByCategory);
        
        // Initialize lazy loading
        lazyLoadImages();
        
    } catch (error) {
        blogList.innerHTML = `<p class='error-message'>Lỗi khi tải danh sách bài viết: ${error.message}</p>`;
        console.error("Error loading posts:", error);
    }
    
    // Debounce function to limit search frequency
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    // Display featured posts
    function renderFeaturedPosts(allPosts) {
        const featuredPosts = allPosts.filter(post => post.featured === "true").slice(0, 3);
        
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
    }
    
    // Render post list
    function renderPosts(filteredPosts) {
        if (filteredPosts.length === 0) {
            blogList.innerHTML = "<p class='no-results'>Không tìm thấy bài viết nào.</p>";
            return;
        }

        blogList.innerHTML = filteredPosts.map(post => `
            <article>
                <img class="lazy" data-src="${post.image}" alt="${post.title}"/>
                <h2><a href="post.html?post=${post.slug}">${post.title}</a></h2>
                <p class=""><strong>Ngày đăng:</strong> ${post.date}</p>
                <p>${post.description}</p>
            </article>
        `).join("");
        
        // Reinitialize lazy loading after content change
        lazyLoadImages();
    }

    // Search posts using Fuse.js
    function fuseSearchPosts() {
        const searchTerm = searchInput.value.trim();
        
        if (!searchTerm) {
            renderPosts(posts);
            return;
        }
        
        let results = fuse.search(searchTerm).map(result => result.item);
        renderPosts(results);
    }
    
    // Filter by category
    function filterByCategory() {
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
    }
});

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


//log('Welcome!')
//log('Welcome!', "error")
//log('Welcome!', "success")


function lazyLoadImages() {
    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
        // Fallback for browsers that don't support IntersectionObserver
        const lazyImages = document.querySelectorAll('.lazy');
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            img.classList.remove("lazy", "skeleton");
        });
        return;
    }
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                
                if (src) {
                    img.src = src;
                    img.classList.remove("lazy", "skeleton");
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: "50px 0px", // Start loading images when they're 50px from entering the viewport
        threshold: 0.01
    });
    
    document.querySelectorAll('.lazy').forEach(img => imageObserver.observe(img));
}

