
function autoDarkMode() {
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 6) {
        document.documentElement.classList.add("dark");
    }
}
autoDarkMode();

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
# 🥩 Cách Làm Bò Lúc Lắc - Mềm Ngon, Đậm Đà  

> **Bò lúc lắc** là món xào nổi tiếng với thịt bò **mềm ngọt, sốt đậm đà**, kết hợp cùng **ớt chuông, hành tây giòn ngọt**.  

## 📝 **Thông Tin Món Ăn**  
- 🍽 **Khẩu phần**: 3 người  
- ⏳ **Thời gian nấu**: 25 phút  
- ⚡ **Calories**: ~450 kcal/phần  

---

## 🛒 **Nguyên Liệu**  
### 🥩 **Phần thịt bò**  
- **Thịt bò thăn**: 300g (cắt khối vuông)  
- **Hành tím, tỏi băm**: 1 thìa canh  
- **Dầu hào**: 1 thìa canh  
- **Nước tương**: 1 thìa canh  
- **Tiêu, đường, bột ngọt**  
- **Bơ lạt (tùy chọn)**: 10g  

### 🫑 **Phần rau củ**  
- **Ớt chuông xanh, đỏ**: ½ quả mỗi loại  
- **Hành tây**: ½ củ  
- **Cà chua**: 1 quả  
- **Xà lách**: 1 ít (ăn kèm)  

---

## 👩‍🍳 **Cách Làm Bò Lúc Lắc**  

### 1️⃣ **Ướp thịt bò**  
✔️ Trộn thịt bò với **nước tương, dầu hào, tiêu, đường, tỏi băm**, ướp **15 phút**.  

---

### 2️⃣ **Xào bò**  
🔥 Làm nóng chảo với ít dầu ăn, cho thịt bò vào **xào lửa lớn** đến khi cháy cạnh.  
🧈 **Thêm bơ** vào đảo đều rồi cho ra đĩa.  

---

### 3️⃣ **Xào rau củ**  
🥘 Dùng chảo cũ, xào nhanh **ớt chuông, hành tây, cà chua** khoảng **2 phút**.  
✔️ Cho thịt bò vào xào chung, đảo đều **1 phút** rồi tắt bếp.  

---

## 🍽️ **Thưởng thức**  
✅ Dọn ra đĩa, ăn kèm **xà lách, cơm trắng hoặc khoai tây chiên**.  
✅ Có thể chấm thêm **muối tiêu chanh** để đậm vị hơn.  

---

## 📌 **Mẹo Giúp Thịt Bò Mềm Ngon**  
🔹 **Không ướp muối** vào thịt bò trước khi xào để bò không bị dai.  
🔹 **Xào lửa lớn, nhanh tay** để thịt bò không ra nước.  
🔹 **Thêm bơ lạt** giúp thịt bò có mùi thơm béo đặc trưng.  

💡 **Chúc bạn thành công và ngon miệng!** 😋  

---

📌 **Nguồn:** #ẨmThực #MónXào #BòLúcLắc #ThịtBò
    `)
    
}
//posts
document.addEventListener("DOMContentLoaded", async function () {
    document.getElementById("savePostBtn").addEventListener("click", function () {
    let savedPosts = JSON.parse(localStorage.getItem("savedPosts")) || [];
    let postTitle = document.getElementById("post-title").textContent;

    if (!savedPosts.includes(postTitle)) {
        savedPosts.push(postTitle);
        localStorage.setItem("savedPosts", JSON.stringify(savedPosts));
        log("Bài viết đã được lưu!");
    } else {
        log("Bài viết này đã có trong danh sách!");
    }
});
    showExam();
    //generateTOC();
    //loadPosts();
    let markdown;
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
            markdown = xhr.responseText;
            log(markdown); // 🔍 Kiểm tra nội dung trả về

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
    let fuse;
   // loadPosts()
    
    try {
        // 🔹 Fetch danh sách bài viết từ posts.json
        //const response = await fetch("https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts");
        const response = await fetch("posts.json");
       // console.log('posts.json response', response)
        let p = await response.json()
        posts = p.sort((a, b) => new Date(b.date) - new Date(a.date));
       
        try{posts = posts.filter(post => post.status === "published");
        }catch(e){
          log(e)
        }
        //console.log(posts)
        fuse = setupFuse(posts);
        // 🔹 Lấy danh sách danh mục (tags)
        const uniqueTags = new Set();
        posts.forEach(post => {
          if(post.tags &&  Array.isArray(post.tags))
          {post.tags.forEach(tag => uniqueTags.add(tag))}
        });
         //log('uniqueTags', uniqueTags)
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
        //log("featured")
        if (featuredPosts.length > 0){
          let featuredPostS = [];
          if ( featuredPosts.length >3){
            featuredPosts.splice(1);
          }
          featuredList.innerHTML = featuredPosts.map(post => `
                <article class="featured">
                    <img class="skeleton skeleton-image lazy" data-src="${post.image}" alt="${post.title}"/>
                    <h3 class=""><a href="post.html?post=${post.slug}">${post.title}</a></h3>
                    <p >${post.description}</p>
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
                <p class=""><strong>Ngày đăng:</strong> ${post.date}</p>
                <p>${post.description}</p>
            </article>
        `).join("");
    }

    // 🔹 Hàm lọc bài viết dựa trên tìm kiếm và danh mục
    function fuseSearchPosts() {
      
        const searchTerm = searchInput.value.trim();
        
        
        let results= fuse.search(searchTerm).map(result => result.item);

        renderPosts(results);
    }

    // 🔹 Xử lý tìm kiếm khi bấm nút
    
    searchInput.addEventListener("input", fuseSearchPosts)
    // 🔹 Xử lý lọc theo danh mục
    
    lazyLoadImages();
});

function log(message, type="") {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  if(type === "error"){
  toast.innerText = `⛔ ${message}`;
  }
  else if (type === "success"){
  toast.innerText = `✅ ${message}`;
  }
  else{
  toast.innerText = `ℹ️ ${message}`;
  }

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";  // Làm mờ trước
    setTimeout(() => toast.remove(), 500); // Xóa sau khi hiệu ứng chạy xong
  }, 4500); // Hiển thị trong 2.5 giây, 0.5 giây fade out
}


//log('Welcome!')
//log('Welcome!', "error")
//log('Welcome!', "success")


function lazyLoadImages() {
    const lazyImages = document.querySelectorAll('.lazy');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove("lazy");
                img.classList.remove("skeleton");
                observer.unobserve(img);
                //console.log(img.src)
            }
        });
    });

    lazyImages.forEach(img => observer.observe(img));
}

