const post1 = `
---
title: "Bài viết đầu tiên"
date: 2025-02-15
author: "Tên của bạn"
tags: [minimalist, blog, example]
description: "Bài viết đầu tiên trên blog minimalist."
---

# Chào mừng đến với Minimalist Blog

*Ngày đăng: 15/02/2025 | Tác giả: Tên của bạn*

---

## Nội dung bài viết

Đây là một bài viết mẫu viết bằng Markdown.

javascript
// Đây là đoạn code JavaScript
console.log("Hello, Blog!");
`;
//console.log(post1)
async function fetchPosts() {
   // console.log('fetchpoa5');
    
    const response = await fetch("https://minimblog.netlify.app/posts");
    const files = await response.json();
    console.log(files);
    const posts = await Promise.all(
        files
            .filter(file => file.name.endsWith(".md"))
            .map(async file => {
                const postResponse = await fetch(file.download_url);
                const markdown = await postResponse.text();
                return extractMetadata(markdown, file.name);
            })
    );

    renderPosts(posts);
}

function extractMetadata(markdown, filename) {
    const yamlRegex = /^---\n([\s\S]+?)\n---\n/;
    const match = markdown.match(yamlRegex);
    let metadata = {};
    let content = markdown;

    if (match) {
        metadata = parseYAML(match[1]);
        content = markdown.replace(yamlRegex, "");
    }

    return {
        title: metadata.title || filename.replace(".md", ""),
        date: metadata.date || "Không rõ",
        description: metadata.description || "",
        tags: metadata.tags || [],
        image: metadata.image || "",
        slug: filename.replace(".md", ""),
        content
    };
}

//posts
document.addEventListener("DOMContentLoaded", function () {
   // fetchPosts();
    //loadPosts();
  
    if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }
    
    const params = new URLSearchParams(window.location.search);
    const postFile = params.get("post");
    //console.log(postFile);
    if (!postFile) {
        document.getElementById("post-list").innerHTML = "<p>Bài viết không tồn tại.</p>";
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("GET", `posts/${postFile}.md`, true);
    
    xhr.onload = function () {
        //console.log("stt", xhr.status);
        if (xhr.status >= 200 && xhr.status < 300) {
            let markdown = xhr.responseText;

            //log( "md",markdown); // 🔍 Kiểm tra nội dung trả về

            // Nếu nội dung bắt đầu bằng <!DOCTYPE html>, nghĩa là đang lấy nhầm file HTML
            if (markdown.startsWith("<!DOCTYPE html>")) {
                document.getElementById("post-content").innerHTML = "<p>Lỗi: Tải nhầm file HTML thay vì Markdown.</p>";
                return;
            }
            // Loại bỏ YAML Front Matter
            markdown = markdown.replace(/^---[\s\S]+?---\s*/, '').trim();
            // Chuyển đổi Markdown thành HTML
            marked.setOptions({
            breaks: true, // Xuống dòng đúng cách
            smartLists: true, // Cải thiện danh sách
            smartypants: true, // Chuyển đổi ký tự đặc biệt
            gfm: true, // Hỗ trợ GitHub Flavored Markdown
            renderer: new marked.Renderer(),
            highlight: function (code, lang) {
                return lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value: hljs.highlightAuto(code).value;
            }
        });
        
        // 🔹 Cấu hình Marked.js với Highlight.js
        
        
            document.getElementById("post-content").innerHTML = marked.parse(markdown);
            log(marked.parse(markdown));
            // 🔹 Tô màu tất cả các đoạn code trong <pre><code>
        document.querySelectorAll("pre code").forEach((block) => {
            hljs.highlightElement(block);
        });
        } else {
            document.getElementById("post-content").innerHTML = "<p>Lỗi khi tải bài viết.</p>";
        }
    };
    xhr.onerror = function () {
        document.getElementById("post-content").innerHTML = "<p>Lỗi kết nối đến máy chủ.</p>";
    };

    xhr.send();
    
  
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
    //console.log("loadPosts");
    const blogList = document.getElementById("post-list");

    try {
        // 🔹 Fetch danh sách bài viết từ posts.json
        const response = await fetch("posts.json");
        const posts = await response.json();

        // 🔹 Hiển thị danh sách bài viết
        blogList.innerHTML = posts.map(post => `
            <article>
                <h2><a href="post.html?post=${post.file}">${post.title}</a></h2>
                <p><strong>Ngày đăng:</strong> ${post.date}</p>
                <p>${post.description}</p>
            </article>
        `).join("");
    } catch (error) {
        blogList.innerHTML = "<p>Lỗi khi tải danh sách bài viết.</p>";
        console.error("Lỗi:", error);
    }

};
//index
document.addEventListener("DOMContentLoaded", async function () {
    const blogList = document.getElementById("post-list");
    const featuredList = document.getElementById("featured-list");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const categoryFilter = document.getElementById("categoryFilter");

  if (!blogList || !searchInput || !searchButton || !categoryFilter) {
        // index.html call
        return;
        console.error("Không tìm thấy phần tử cần thiết trong DOM.");
        console.log(blogList, searchInput, searchButton, categoryFilter);
    }
    let posts = [];
    //loadPosts()
    
    try {
        // 🔹 Fetch danh sách bài viết từ posts.json
        const response = await fetch("posts.json");
        //console.log(response)
        posts = await response.json();

        // 🔹 Lấy danh sách danh mục (tags)
        const uniqueTags = new Set();
        posts.forEach(post => post.tags.forEach(tag => uniqueTags.add(tag)));

        // 🔹 Thêm danh mục vào dropdown filter
        uniqueTags.forEach(tag => {
            const option = document.createElement("option");
            option.value = tag;
            option.textContent = tag;
            categoryFilter.appendChild(option);
        });

        // 🔹 Hiển thị danh sách bài viết ban đầu
        renderPosts(posts);

    } catch (error) {
        blogList.innerHTML = "<p class='error-message'>Lỗi khi tải danh sách bài viết.</p>";
        console.error("Lỗi:", error);
    }
    
    // 🔹 Hiển thị bài viết nổi bật
        const featuredPosts = posts.filter(post => post.featured);
        if (featuredPosts.length > 0) {
            featuredList.innerHTML = featuredPosts.map(post => `
                <article class="featured">
                    <img src="${post.image}" alt="${post.title}"/>
                    <h3><a href="post.html?post=${post.file}">${post.title}</a></h3>
                    <p>${post.description}</p>
                </article>
            `).join("");
        } else {
            featuredList.innerHTML = "<p>Chưa có bài viết nổi bật.</p>";
        }

    // 🔹 Hàm hiển thị bài viết
    function renderPosts(filteredPosts) {
        if (filteredPosts.length === 0) {
            blogList.innerHTML = "<p class='no-results'>Không tìm thấy bài viết nào.</p>";
            return;
        }

        blogList.innerHTML = filteredPosts.map(post => `
            <article>
                    <img src="${post.image}" alt="${post.title}"/>
                <h2><a href="post.html?post=${post.file}">${post.title}</a></h2>
                <p><strong>Ngày đăng:</strong> ${post.date}</p>
                <p>${post.description}</p>
                <p><strong>Danh mục:</strong> ${post.tags.join(", ")}</p>
            </article>
        `).join("");
    }

    // 🔹 Hàm lọc bài viết dựa trên tìm kiếm và danh mục
    function filterPosts() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;

        let filteredPosts = posts.filter(post => 
            post.title.toLowerCase().includes(searchTerm) || 
            post.description.toLowerCase().includes(searchTerm) || 
            post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );

        if (selectedCategory !== "all") {
            filteredPosts = filteredPosts.filter(post => post.tags.includes(selectedCategory));
        }

        renderPosts(filteredPosts);
    }

    // 🔹 Xử lý tìm kiếm khi bấm nút
    searchButton.addEventListener("click", filterPosts);

    // 🔹 Xử lý lọc theo danh mục
    categoryFilter.addEventListener("change", filterPosts);
});

function log(message){
    // Tạo một box thông báo lỗi trong giao diện Acode
    const errorBox = document.createElement("div");
    errorBox.style.position = "fixed";
    errorBox.style.bottom = "10px";
    errorBox.style.left = "10px";
    errorBox.style.right = "10px";
    errorBox.style.padding = "10px";
    errorBox.style.background = "#483746";
    errorBox.style.color = "white";
    errorBox.style.fontSize = "14px";
    errorBox.style.borderRadius = "5px";
    errorBox.style.zIndex = "10000";
    errorBox.textContent = `${message}`;
    document.body.appendChild(errorBox);

    // Tự động ẩn box lỗi sau 5 giây
    setTimeout(() => {
        errorBox.remove();
    }, 5000);
};

