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
console.log(post1)

document.addEventListener("DOMContentLoaded", function () {
     
    loadPosts();
  
    if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }
    
    const params = new URLSearchParams(window.location.search);
    const postFile = params.get("post");

    if (!postFile) {
        document.getElementById("post-list").innerHTML = "<p>Bài viết không tồn tại.</p>";
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("GET", `posts/${postFile}.md`, true);
    
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            let markdown = xhr.responseText;

            console.log( markdown); // 🔍 Kiểm tra nội dung trả về

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
            renderer: new marked.Renderer()
        });
            document.getElementById("post-content").innerHTML = marked.parse(markdown);
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
    console.log("loadPosts");
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

document.addEventListener("DOMContentLoaded", async function () {
    const blogList = document.getElementById("post-list");
    const featuredList = document.getElementById("featured-list");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const categoryFilter = document.getElementById("categoryFilter");

  if (!blogList || !searchInput || !searchButton || !categoryFilter) {
        console.error("Không tìm thấy phần tử cần thiết trong DOM.");
        console.log(blogList, searchInput, searchButton, categoryFilter);
    }
    let posts = [];

    try {
        // 🔹 Fetch danh sách bài viết từ posts.json
        const response = await fetch("posts.json");
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