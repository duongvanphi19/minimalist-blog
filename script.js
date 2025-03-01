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

        // Set post metadata
        document.title = `${metadata.title || "Bài viết"} - Minimalist Blog`;
        document.getElementById("post-title").textContent = metadata.title || "Unknown";
        document.getElementById("post-author").textContent = metadata.author || "Unknown";
        document.getElementById("post-date").textContent = metadata.date || "Unknown";

        // Set post image with fallback
        const postImage = document.getElementById("post-image");
        if (postImage) {
            postImage.dataset.src = metadata.image || "/assets/uploads/default.jpg";
            postImage.alt = metadata.title || "Post image";
            postImage.onerror = function() {
                this.src = "/assets/uploads/default.jpg";
                this.onerror = null;
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
            .slice(0, 3);

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

        lazyLoadImages();
    }
}

// Initialize on DOM content loaded
document.addEventListener("DOMContentLoaded", function() {
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

        // Handle index page
        handleIndexPage();

    } catch (error) {
        console.error("Initialization error:", error);
    }
});