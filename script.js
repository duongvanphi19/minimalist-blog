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

    