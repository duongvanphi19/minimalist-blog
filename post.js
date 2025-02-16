document.addEventListener("DOMContentLoaded", async function () {
    console.log("DOM đã tải xong - post.html!");
    await loadPost();
});

/**
 * Load bài viết dựa vào tham số URL `post`
 */
async function loadPost() {
    const params = new URLSearchParams(window.location.search);
    const postFile = params.get("post");

    if (!postFile) {
        showError("Bài viết không tồn tại.");
        return;
    }

    try {
        const markdown = await fetchMarkdown(`posts/${postFile}.md`);
        const { metadata, content } = extractMetadata(markdown);
        updatePostContent(metadata, content);
    } catch (error) {
        console.error("Lỗi khi tải bài viết:", error);
        showError("Không thể tải bài viết.");
    }
}

/**
 * Fetch nội dung file Markdown
 * @param {string} url - Đường dẫn tới file Markdown
 * @returns {Promise<string>}
 */
async function fetchMarkdown(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Lỗi: ${response.statusText}`);
    }
    return response.text();
}

/**
 * Tách YAML Front Matter và nội dung Markdown
 * @param {string} markdown - Nội dung Markdown chứa YAML
 * @returns {object} - { metadata: {}, content: string }
 */
function extractMetadata(markdown) {
    // Sử dụng regex để tách YAML Front Matter
    const yamlRegex = /^---\n([\s\S]+?)\n---\n/;
    const match = markdown.match(yamlRegex);
    let metadata = {};
    let content = markdown;
    if (match) {
        metadata = parseYAML(match[1]);
        content = markdown.replace(yamlRegex, "");
    }
    return { metadata, content };
}

/**
 * Chuyển YAML thành object
 * @param {string} yamlString - Chuỗi YAML từ Front Matter
 * @returns {object}
 */
function parseYAML(yamlString) {
    const lines = yamlString.split("\n");
    const obj = {};
    lines.forEach(line => {
        const parts = line.split(":");
        if (parts.length >= 2) {
            const key = parts.shift().trim();
            const value = parts.join(":").trim();
            obj[key] = value;
        }
    });
    return obj;
}

/**
 * Cập nhật nội dung bài viết lên DOM
 * @param {object} metadata - Metadata của bài viết (title, author, date, image)
 * @param {string} content - Nội dung Markdown
 */
function updatePostContent(metadata, content) {
    const postTitleEl = document.getElementById("post-title");
    const postDateEl = document.getElementById("post-date");
    const postAuthorEl = document.getElementById("post-author");
    const postImageEl = document.getElementById("post-image");
    const postContentEl = document.getElementById("post-content");

    if (!postTitleEl || !postDateEl || !postAuthorEl || !postContentEl) {
        console.error("Không tìm thấy các phần tử DOM cần thiết.");
        return;
    }

    postTitleEl.textContent = metadata.title || "Không có tiêu đề";
    postDateEl.textContent = metadata.date || "";
    postAuthorEl.textContent = metadata.author || "";

    if (metadata.image) {
        postImageEl.src = metadata.image;
        postImageEl.style.display = "block";
    } else {
        postImageEl.style.display = "none";
    }

    // Chuyển đổi Markdown thành HTML
    postContentEl.innerHTML = marked.parse(content);

    // Tô màu các đoạn code trong <pre><code>
    document.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
    });
}

/**
 * Hiển thị thông báo lỗi
 * @param {string} message - Thông báo lỗi
 */
function showError(message) {
    const postContentEl = document.getElementById("post-content");
    if (postContentEl) {
        postContentEl.innerHTML = `<p style="color: red;">${message}</p>`;
    }
}