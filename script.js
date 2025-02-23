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

    lines.forEach(line => {
      console.log(line)
        const [key, ...value] = line.split(": ");
        
          if (key && value.length) {
            let val = value.join(": ").trim();
          
          if (val.startsWith('"') && val.endsWith('"')){
              val = val.slice(1,-1);
            }

            // Nếu là một danh sách (array)
            if (val.startsWith("[") && val.endsWith("]")) {
                try {
                    val = JSON.parse(val.replace(/'/g, '"')); // Chuyển YAML array thành JSON array hợp lệ
                } catch (error) {
                    console.warn("Lỗi khi parse YAML array:", error);
                    val = []; // Trả về mảng rỗng nếu lỗi
                }
            }

            result[key.trim()] = val;
        }
    });
   // log(json.stringify(result))
    return result;
}

/**
 * Tạo Table of Contents (TOC) từ nội dung bài viết.
 */
function generateTOC() {
    const postContent = document.getElementById("post-content");
    const tocContainer = document.getElementById("post-toc");
    const headers = postContent.querySelectorAll("h2, h3");
    if (headers.length === 0) {
        tocContainer.style.display = "none"; // Ẩn TOC nếu không có tiêu đề nào
        return;
    }

    tocContainer.innerHTML = "<h2>Nội dung chính</h2>";
    const tocList = document.createElement("ul");
    let lastH2Item = null; // Lưu `li` của `h2` gần nhất
    let currentSubList = null; // Lưu `ul` chứa `h3`

    headers.forEach((header, index) => {
        const id = `section-${index}`;
        header.id = id; // Gán ID để điều hướng

        const listItem = document.createElement("li");
        listItem.innerHTML = `<a href="#${id}">${header.innerText}</a>`;

        if (header.tagName === "H2") {
            // Nếu là H2, tạo danh sách con mới cho H3 tiếp theo
            currentSubList = document.createElement("ul");
            listItem.appendChild(currentSubList);
            tocList.appendChild(listItem);
            lastH2Item = listItem;
        } else if (header.tagName === "H3" && lastH2Item) {
            // Nếu là H3, thêm vào danh sách con của H2 gần nhất
            currentSubList.appendChild(listItem);
        }
    });

    tocContainer.appendChild(tocList);
    tocContainer.style.display = "block"; // Hiển thị TOC nếu có tiêu đề
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
   // showExam();
    //generateTOC();
    //loadPosts();
  
    if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }
    
    const params = new URLSearchParams(window.location.search);
    const postFile = params.get("post");
    //console.log(postFile);
    try{
      const response = await fetch(`/posts/${postFile}.md`)
    }catch(e){
      log("error load")
      return
    }
    if (!postFile) {
        document.getElementById("post-list").innerHTML = "<p>Bài viết không tồn tại.</p>";
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("GET", `https://minimblog.netlify.app/posts/${postFile}.md`, true);
    
    xhr.onload = function () {
        //console.log("stt", xhr.status);
        if (xhr.status >= 200 && xhr.status < 300) {
            let markdown = xhr.responseText;
            //log(markdown); // 🔍 Kiểm tra nội dung trả về

            // Nếu nội dung bắt đầu bằng <!DOCTYPE html>, nghĩa là đang lấy nhầm file HTML
            if (markdown.startsWith("<!DOCTYPE html>")) {
                document.getElementById("post-content").innerHTML = "<p>Lỗi: Tải nhầm file HTML thay vì Markdown.</p>";
                return;
            }
            
           const {metadata, content} = extractMetadata(markdown);
           //log(content)
            
            //log("^^^")
            // Loại bỏ YAML Front Matter
            markdown = markdown.replace(/^---[\s\S]+?---\s*/, '').trim();
            // Chuyển đổi Markdown thành HTML
          try{
          //log(metadata.title)
          document.getElementById("post-title").innerHTML = metadata.title || "Unknown";
          document.getElementById("post-author").innerHTML = metadata.author || "Unknown";
          document.getElementById("post-date").innerHTML = metadata.date || "Unknown";
          document.getElementById("post-image").src = metadata.image || "Unknown";
          //document.getElementById("post-description").innerHTML = metadata.description || "Unknown";
          }catch(e){
            log(e)
          }
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
          document.getElementById("post-content").innerHTML = marked.parse(markdown);
          //log(marked.parse(markdown));
            // 🔹 Tô màu tất cả các đoạn code trong <pre><code>
          document.querySelectorAll("pre code").forEach((block) => {
            hljs.highlightElement(block);
        });
        } else {
            document.getElementById("post-content").innerHTML = "<p>Lỗi khi tải bài viết.</p>";
        }
    generateTOC();
    
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
  log("load posts");
  const response = await fetch("/posts/");
  const data = await response.json();
  const a = await response.text();
  log(data);
  log(a);
}
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
   // loadPosts()
    
    try {
        // 🔹 Fetch danh sách bài viết từ posts.json
        //const response = await fetch("https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts");
        const response = await fetch("posts.json");
       // console.log('posts.json response', response)
        posts = await response.json();
        try{posts = posts.filter(post => post.status === "published");
        }catch(e){
          log(e)
        }
        //console.log(posts)
        // 🔹 Lấy danh sách danh mục (tags)
        const uniqueTags = new Set();
        posts.forEach(post => {
          if(post.tags &&  Array.isArray(post.tags))
          {post.tags.forEach(tag => uniqueTags.add(tag))}
        });
         log('uniqueTags', uniqueTags)
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
                    <h3><a href="post.html?post=${post.slug}">${post.title}</a></h3>
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
                <h2><a href="post.html?post=${post.slug}">${post.title}</a></h2>
                <p><strong>Ngày đăng:</strong> ${post.date}</p>
                <p>${post.description}</p>
                <p><strong>Danh mục:</strong> ${post.tags}</p>
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

function lll9log(message){
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
    errorBox.style.opacity= "95%";
    errorBox.textContent = `${message}`;
    document.body.appendChild(errorBox);

    // Tự động ẩn box lỗi sau 5 giây
    setTimeout(() => {
        errorBox.remove();
    }, 5000);
};

function log(message) {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");

  toast.className = "toast";
  toast.innerText = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";  // Làm mờ trước
    setTimeout(() => toast.remove(), 500); // Xóa sau khi hiệu ứng chạy xong
  }, 4500); // Hiển thị trong 2.5 giây, 0.5 giây fade out
}

log('Welcome!')

