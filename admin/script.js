

document.addEventListener("DOMContentLoaded", () => {
    loadPosts();
    if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }
  

// Đăng ký sự kiện cho nút toggle
document.getElementById("darkModeToggle").addEventListener("click", toggleDarkMode);

document.getElementById("newPostButton").addEventListener("click", newPost);
});

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  // Lưu trạng thái trong localStorage
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("darkMode", "enabled");
  } else {
    localStorage.setItem("darkMode", "disabled");
  }
}

function createSlug(title) {
    return title
        .toLowerCase() // Chuyển thành chữ thường
        .normalize("NFD") // Tách dấu khỏi ký tự gốc (ví dụ: "á" → "a")
        .replace(/[\u0300-\u036f]/g, "") // Xóa dấu
        .replace(/đ/g, "d") // Đổi "đ" thành "d"
        .replace(/[^a-z0-9\s-]/g, "") // Xóa ký tự đặc biệt (giữ lại chữ, số, dấu cách)
        .trim() // Xóa khoảng trắng đầu & cuối
        .replace(/\s+/g, "-"); // Đổi khoảng trắng thành dấu "-"
}


function newPost() {
    const title = prompt("Nhập tiêu đề bài viết:");
    if (!title) return;

    const slug = createSlug(title); // Tạo tên file từ tiêu đề
    const content = `---
    title: "${title}"
    date: "${new Date().toISOString().split("T")[0]}"
    author: "Admin"
    tags: ["Mới"]
    image: "/assets/uploads/sample.jpg"
    featured: "false"
    slug: "${slug}"
    filename: "${slug}.md"
---
# ${title}

Nội dung bài viết tại đây...
`;

    // Mở trình soạn thảo với nội dung mới
    document.getElementById("markdownEditor").value = content;
    document.getElementById("editor").style.display = "block";
    updatePreview(content);

    document.getElementById("saveButton").onclick = () => savePost(slug + ".md", content);
    
}

// 📝 Tải danh sách bài viết từ GitHub
async function loadPosts() {
  
    const response = await fetch(`https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts`);
    if (!response.ok) {
        console.error("Không thể tải danh sách bài viết.");
        return;
    }
    //console.log(response)
    const posts = await response.json();
    const blogList = document.getElementById("blog-list");
    
    posts.forEach(post => {
        const postItem = document.createElement("div");
        postItem.innerHTML = `<a href="#editHere" onclick="editPost('${post.name}')">${post.name}</a>`;
        blogList.appendChild(postItem);
    });
}

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
        const [key, ...value] = line.split(": ");
        
          if (key && value.length) {
            let val = value.join(": ").trim();
          
          if (val.startsWith('"') && val.endsWith('"')){
              val = val.slice(1,-1);
            }

            // Nếu là một danh sách (array)
            if (val.startsWith("[") && val.endsWith("]")) {
                try {
                  console.log(val);
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

// ✏️ Chỉnh sửa bài viết
function FrontMatter(markdown){
  //content = markdown.replace(/^---[\s\S]+?---\s*/, '').trim();
  const {metadata, content} = extractMetadata(markdown);
  
  const head = `
  # ${metadata.title}
  ![${metadata.title}](../${metadata.image})
  
  `;
 
  
  return head + content;
}
// Dùng front-matter.js để parse YAML trước khi chuyển Markdown thành HTML



// Khi tải bài viết, parse YAML & Markdown


async function editPost(filename, newContent=null) {
  //console.log("editpost")
    const response = await fetch(`https://raw.githubusercontent.com/duongvanphi19/minimalist-blog/main/posts/${filename}`);
    console.log(response)
    if (!response.ok) {
        console.error("Không thể tải bài viết.");
        return;
    }
    const markdown = await response.text();
    const parsed = marked.parse(FrontMatter(markdown));
    
    
    updatePreview(parsed);
    document.getElementById("markdownEditor").value = markdown;
    document.getElementById("editor").style.display = "block";
    document.getElementById("saveButton").onclick = () => savePost(filename);
}

function encodeBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(base64Str) {
    return decodeURIComponent(escape(atob(base64Str)));
}

async function updatePostsJson(filename, metadata) {
    const postsFile = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts.json`
    //const url = '/.netlify/functions/savePost';
    const token = atob("dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==")

    // 🛑 Lấy nội dung hiện tại của `posts.json`
    const response = await fetch(postsFile, { headers: { Authorization: token } });

    if (!response.ok) {
        log("⛔ Lỗi khi tải `posts.json`!");
        return;
    }
    
    
    const postsData = await response.json();
    //console.log("postsData", postsData.content)
    
    let posts =[];
    log(decodeBase64(postsData.content))
    
    try{ 
      posts = JSON.parse(decodeBase64(postsData.content));
    //console.log('decodeBase64 postsData ok')
    }catch(e){
      console.log("decodeBase64 postsData failed")
    }

    // 🛑 Kiểm tra xem bài viết đã có trong danh sách chưa
    //console.log(JSON.stringify(posts, null,2));
    const exists = posts.some(post => post.file === filename);
    //console.log('posts[0]', posts[0]);

    console.log('metadata', metadata)
    if (!exists) {
        console.log("📂 Đang thêm bài viết vào `posts.json`...");
        const newItem = {
            title: metadata.title,
            date: metadata.date,
            author: metadata.author,
            tags: metadata.tags,
            image: metadata.image,
            file: filename,
            featured: false
        }
        console.log("newItem", metadata)
        console.log('newItem json', JSON.stringify(metadata, null,2));
        posts.push(metadata);

        const updatedPosts = encodeBase64(JSON.stringify(posts, null, 2));
        //console.log("updatedPosts", updatedPosts)
        
        // ✅ Cập nhật `posts.json` trên GitHub
        await fetch(postsFile, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token
            },
            body: JSON.stringify({
                message: "Cập nhật danh sách bài viết",
                content: updatedPosts,
                sha: postsData.sha
            })
        });

        log("✅ `posts.json` đã được cập nhật!");
    } else {
        log("📜 Bài viết đã tồn tại trong `posts.json`, không cần cập nhật.");
    }
}
// 💾 Lưu bài viết lên GitHub
async function savePost(filename) {
    function encodeBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}
    const content = document.getElementById("markdownEditor").value;
    const metadata = extractMetadata(content);
   // console.log(content);// Chuyển Markdown thành Base64
    
    // Cần lấy SHA của file trước khi cập nhật
    const getFileResponse = await fetch(`https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`);
    const fileExists = getFileResponse.ok;
    const sha = fileExists ? (await getFileResponse.json()).sha : undefined;
   

    const data = {
        message: fileExists ?  "Cập nhật bài viết" : "Tạo bài viết mới",
        content: encodeBase64(content),
        sha: sha
    };
    //console.log(data)
      const url = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`
    //const url = '/.netlify/functions/savePost';
    const token = atob("dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==")
    //log(token)
    const response = await fetch(url,{
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token
        },
        body: JSON.stringify(data)
    });
    // console.log('put',response);
     //log(response.status)
    //const result = await response.json();
    //log(result);
    if (response.ok) {
        console.log("✅ Bài viết đã được cập nhật!");
      //log(`✅ ${fileExists ?  "Bài viết đã được cập nhật!" : "Bài viết mới đã được tạo!"}`);
      try{await updatePostsJson(filename, metadata.metadata)}catch(e){console.log(e)}
    } else {
        alert("⛔ Lỗi khi lưu bài viết.", result.message);
    }
}

// Thêm thư viện marked.js để hiển thị Markdown
const loadScript = (url, callback) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
};

loadScript("https://cdn.jsdelivr.net/npm/marked/marked.min.js", () => {
    console.log("marked.js loaded");
});




// Xử lý Live Edit
document.getElementById("markdownEditor").addEventListener("input", function () {
    const markdownText = this.value;
    updatePreview(markdownText);
});

function updatePreview(markdownText){
  document.getElementById("previewContent").innerHTML = marked.parse(markdownText);
}
// Hiển thị Editor + Xem trước khi chỉnh sửa bài viết
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
    errorBox.style.opacity= "95%";
    errorBox.textContent = `${message}`;
    document.body.appendChild(errorBox);

    // Tự động ẩn box lỗi sau 5 giây
    setTimeout(() => {
        errorBox.remove();
    }, 5000);
};

