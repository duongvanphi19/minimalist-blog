function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  // Lưu trạng thái trong localStorage
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("darkMode", "enabled");
  } else {
    localStorage.setItem("darkMode", "disabled");
  }
}


// Hàm chuyển đổi Dark Mode
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
            if (markdown.startsWith("<!DOCTYPE html>")) {
                document.getElementById("post-content").innerHTML = "<p>Lỗi: Tải nhầm file HTML thay vì Markdown.</p>";
                return;
                
            
            // Nếu nội dung bắt đầu bằng <!DOCTYPE html>, nghĩa là đang lấy nhầm file HTML
             // 🔍 Kiểm tra nội dung trả về
            
            }
            // Loại bỏ YAML Front Matter
            markdown = markdown.replace(/^---[\s\S]+?---\s*/, '').trim();
            // Chuyển đổi Markdown thành HTML
            marked.setOptions({
            breaks: true,
            gfm: true,
            highlight: function (code, lang) {
                return lang && hljs.getLanguage(lang) 
                    ? hljs.highlight(code, { language: lang }).value 
                    : hljs.highlightAuto(code).value;
            }
        });
        
const yamlMatch = markdown.match(/^---\n([\s\S]+?)\n---/);
        let metadata = {};
        if (yamlMatch) {
            markdown = markdown.replace(yamlMatch[0], ""); // Xóa YAML khỏi nội dung Markdown
            console.log(parseYAML(yamlMatch[1])); // Chuyển YAML thành object
        
}
        // 🔹 Render nội dung Markdown vào HTML
                document.getElementById("post-title").textContent = metadata.title || "Bài viết";
        document.getElementById("post-date").textContent = metadata.date || "Không có ngày";
        document.getElementById("post-author").textContent = metadata.author || "Tác giả ẩn danh";
        document.getElementById("post-content").innerHTML = marked.parse(markdown);

        // 🔹 Hiển thị hình ảnh đại diện (nếu có)
        if (metadata.image) {
            document.getElementById("post-image").src = metadata.image;
            document.getElementById("post-image").style.display = "block";
        }

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
    
  function parseYAML(yamlString) {
    const lines = yamlString.split("\n");
    const obj = {};
    lines.forEach(line => {
        const [key, ...value] = line.split(": ");
        if (key && value.length) {
            obj[key.trim()] = value.join(": ").trim();
        }
    });
    return obj;
}
});

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

// Đăng ký sự kiện cho nút toggle
document.getElementById("darkModeToggle").addEventListener("click", toggleDarkMode);

async function loadPosts() {
  
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

