document.addEventListener("DOMContentLoaded", async function () {
    console.log("DOM đã tải xong - index.html!");
    const darkModeToggle = document.getElementById("darkModeToggle");
    const body = document.body;

    // Kiểm tra trạng thái dark mode đã lưu trước đó
    if (localStorage.getItem("darkMode") === "enabled") {
        body.classList.add("dark-mode");
        darkModeToggle.textContent = "☀️ Light Mode";
    }

    // Xử lý sự kiện khi nhấn nút
    darkModeToggle.addEventListener("click", function () {
        body.classList.toggle("dark-mode");

        if (body.classList.contains("dark-mode")) {
            localStorage.setItem("darkMode", "enabled");
            darkModeToggle.textContent = "☀️ Light Mode";
        } else {
            localStorage.setItem("darkMode", "disabled");
            darkModeToggle.textContent = "🌙 Dark Mode";
        }
    });


    try {
        const response = await fetch("posts.json");
        const posts = await response.json();
        renderFeaturedPosts(posts);
        renderPosts(posts);
    } catch (error) {
        console.error("Lỗi khi tải danh sách bài viết:", error);
        document.getElementById("blog-list").innerHTML = "<p class='error-message'>Lỗi khi tải danh sách bài viết.</p>";
    }
});

/**
 * Hiển thị danh sách bài viết vào phần <div id="blog-list">
 * @param {Array} posts - Danh sách bài viết lấy từ posts.json
 */
function renderPosts(posts) {
    const blogList = document.getElementById("blog-list");
    if (!blogList){
      console.log("blogList null");
      return;
    }
    if (!posts || posts.length === 0) {
        blogList.innerHTML = "<p class='no-results'>Không có bài viết nào.</p>";
        return;
    }
    blogList.innerHTML = posts.map(post => `
        <article>
            <h2><a href="post.html?post=${encodeURIComponent(post.file)}">${post.title}</a></h2>
            <p><strong>Ngày đăng:</strong> ${post.date}</p>
            <p>${post.description}</p>
            <p><strong>Danh mục:</strong> ${post.tags ? post.tags.join(", ") : ""}</p>
        </article>
    `).join("");
}

/**
 * Hiển thị các bài viết nổi bật (featured) nếu có.
 * @param {Array} posts - Danh sách bài viết
 */
function renderFeaturedPosts(posts) {
    const featuredList = document.getElementById("featured-list");
    if (!featuredList){
      console.log("featuredList null");
      
    }
    const featuredPosts = posts.filter(post => post.featured);
    if (featuredPosts.length === 0) {
        featuredList.innerHTML = "";
        return;
    }
    featuredList.innerHTML = `
      <h2>🔥 Bài viết nổi bật</h2>
      ${featuredPosts.map(post => `
        <article class="featured">
          <h3><a href="post.html?post=${encodeURIComponent(post.file)}">${post.title}</a></h3>
          <p>${post.description}</p>
        </article>
      `).join("")}
    `;
}
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const searchButton = document.getElementById("searchButton");

    if (searchInput && categoryFilter && searchButton) {
        searchButton.addEventListener("click", function () {
            filterPosts();
        });

        searchInput.addEventListener("input", function () {
            filterPosts();
        });

        categoryFilter.addEventListener("change", function () {
            filterPosts();
        });
    }
});

/**
 * Lọc bài viết theo từ khóa và danh mục
 */
function filterPosts() {
    const searchText = document.getElementById("searchInput").value.toLowerCase();
    const selectedCategory = document.getElementById("categoryFilter").value;
    const posts = document.querySelectorAll(".blog-list article");

    posts.forEach(post => {
        const title = post.querySelector("h2").textContent.toLowerCase();
        const category = post.dataset.category;

        const matchesText = title.includes(searchText);
        const matchesCategory = selectedCategory === "" || category === selectedCategory;

        if (matchesText && matchesCategory) {
            post.style.display = "block";
        } else {
            post.style.display = "none";
        }
    });
}

// Hàm highlight dòng bị lỗi trong Acode Editor
function markErrorLine(line) {
    if (window.editor && line) {
        window.editor.markText(
            { line: line - 1, ch: 0 },  // Vị trí bắt đầu của dòng lỗi
            { line: line - 1, ch: 100 }, // Kết thúc dòng lỗi
            { className: "error-line" } // Áp dụng class CSS
        );
        console.warn(`🚨 Đã highlight lỗi tại dòng ${line}`);
    } else {
        console.error("❌ Không tìm thấy editor hoặc dòng lỗi.");
    }
}

// Bắt lỗi JavaScript và highlight dòng bị lỗi

window.onerror = function (message, source, lineno, colno, error) {
    console.error(`❌ Lỗi: ${message}\n📍 File: ${source}\n📌 Dòng: ${lineno}:${colno}`);
    
    // Tạo một box thông báo lỗi trong giao diện Acode
    const errorBox = document.createElement("div");
    errorBox.style.position = "fixed";
    errorBox.style.bottom = "10px";
    errorBox.style.left = "10px";
    errorBox.style.right = "10px";
    errorBox.style.padding = "10px";
    errorBox.style.background = "#e5533d";
    errorBox.style.color = "white";
    errorBox.style.fontSize = "14px";
    errorBox.style.borderRadius = "5px";
    errorBox.style.zIndex = "10000";
    errorBox.textContent = `❌ Lỗi tại dòng ${lineno}: ${message} - ${source}`;
    document.body.appendChild(errorBox);

    // Tự động ẩn box lỗi sau 5 giây
    setTimeout(() => {
        errorBox.remove();
    }, 5000);
};

