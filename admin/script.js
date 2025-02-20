document.getElementById("imageUpload").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        document.getElementById("imagePreview").src = e.target.result;
        document.getElementById("imagePreview").style.display = "block";
    };
    reader.readAsDataURL(file);
});
document.getElementById("uploadButton").addEventListener("click", uploadImage);

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

async function uploadImage() {
    const fileInput = document.getElementById("imageUpload");
    const file = fileInput.files[0];

    if (!file) {
        log("❌ Vui lòng chọn một ảnh!");
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async function () {
        const base64Content = reader.result.split(",")[1]; // Lấy phần base64
        
        const filename = `assets/uploads/${createSlug(file.name.substring(0, file.name.lastIndexOf('.')))}.${file.name.split('.').pop().toLowerCase()}`;

        const token = atob("dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==")// 🔥 Thay bằng GitHub Token của bạn
        const repo = "duongvanphi19/minimalist-blog"; // 🔥 Thay bằng tên repo của bạn

        const url = `https://api.github.com/repos/${repo}/contents/${filename}`;

        // Kiểm tra xem file đã tồn tại chưa
        let sha = null;
        const checkFile = await fetch(url, { headers: { Authorization: token }});
        if (checkFile.ok) {
            const fileData = await checkFile.json();
            sha = fileData.sha; // Nếu có file cũ, lấy SHA để cập nhật
        }

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Upload ảnh mới",
                content: base64Content,
                sha: sha || undefined
            })
        });

        const result = await response.json();
        if (response.ok) {
            const imageUrl = result.content.download_url;
            log(`✅ Ảnh ${filename } đã được upload!`);
            insertImageMarkdown(imageUrl);
        } else {
            log("❌ Lỗi khi upload ảnh: " + result.message);
        }
    };
}

function insertImageMarkdown(imageUrl) {
    const editor = document.getElementById("markdownEditor");
    const cursorPos = editor.selectionStart;
    const textBefore = editor.value.substring(0, cursorPos);
    const textAfter = editor.value.substring(cursorPos);
    editor.value = `${textBefore} ![Hình ảnh](${imageUrl}) ${textAfter}`;
    updatePreview(editor.value);
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

function generateID(){
  return Date.now().toString();
}

function newPost() {
    const title = prompt("Nhập tiêu đề bài viết:");
    if (!title) return;

    const slug = createSlug(title);
    const content = `---
title: "${title}"
date: "${new Date().toISOString().split("T")[0]}"
author: "Admin"
description: "Lorem ipsum dolor sit atmet"
tags: ["Mới"]
image: "/assets/uploads/sample.jpg"
featured: "false"
slug: "${slug}"
filename: "${slug}.md"
---
# ${title}

Nội dung bài viết tại đây...
`;

    document.getElementById("markdownEditor").value = content;
    document.getElementById("editor").style.display = "block";
    
    updatePreview(content);

    document.getElementById("saveButton").onclick = () => savePost(slug + ".md");
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
                  //console.log(val);
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
 
 
  return content;
}

async function editPost(filename, newContent=null) {
  //console.log("editpost")
    const response = await fetch(`https://raw.githubusercontent.com/duongvanphi19/minimalist-blog/main/posts/${filename}`);
    //console.log(response)
    if (!response.ok) {
        console.error("Không thể tải bài viết.");
        return;
    }
    const markdown = await response.text();
  
    updatePreview(markdown);
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

async function savePost(filename) {
    function encodeBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }
    const markdown = document.getElementById("markdownEditor").value
    const { metadata, content } = extractMetadata(markdown);
    // Nếu chưa có id, tạo mới
    if (!metadata.id) {
        metadata.id = generateID();
    }
    // Lưu toàn bộ nội dung sau YAML vào metadata.body để so sánh
    //metadata.body = content;
    
    const getFileResponse = await fetch(`https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`);
    const fileExists = getFileResponse.ok;
    const sha = fileExists ? (await getFileResponse.json()).sha : undefined;

    // Sửa lỗi extra double quote ở dòng description
    const newContent = `---
id: "${metadata.id}"
title: "${metadata.title}"
date: "${metadata.date}"
author: "${metadata.author}"
description: "${metadata.description}"
tags: ${JSON.stringify(metadata.tags)}
image: "${metadata.image}"
featured: "${metadata.featured}"
slug: "${metadata.slug}"
filename: "${filename}"
---
${content}`;

    const data = {
        message: fileExists ? "Cập nhật bài viết" : "Tạo bài viết mới",
        content: encodeBase64(newContent),
        sha: sha
    };

    const url = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`;
    const token = atob("dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==");
    const response = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token
        },
        body: JSON.stringify(data)
    });
    if (response.ok) {
        log(`✅ ${fileExists ? "Bài viết đã được cập nhật!" : "Bài viết mới đã được tạo!"}`);
        document.getElementById("markdownEditor").value = newContent;
        console.log(newContent)
        try {
            await updatePostsJson(filename, metadata);
        } catch (e) {
            console.log(e);
        }
    } else {
        alert("⛔ Lỗi khi lưu bài viết.");
    }
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
    //log(decodeBase64(postsData.content))
    
    try{ 
      posts = JSON.parse(decodeBase64(postsData.content));
    //console.log('decodeBase64 postsData ok')
    }catch(e){
      console.log(e)
    }
    //console.log('posts', posts);
    // 🛑 Kiểm tra xem bài viết đã có trong danh sách chưa
    const newItem = {
            id: metadata.id,
            title: metadata.title,
            date: metadata.date,
            author: metadata.author,
            description: metadata.description,
            tags: metadata.tags,
            image: metadata.image,
            slug: metadata.slug,
            filename: metadata.filename,
            featured: metadata.featured
        }
    //console.log(JSON.stringify(posts, null,2));
    const exists = posts.some(post => post.id === metadata.id);
    const index = posts.findIndex(post => post.id === metadata.id)
     

    //console.log(posts[0].filename, newItem.filename)
    
    if (exists) { //bai viet da ton
      if (JSON.stringify(posts[index]) !== JSON.stringify(metadata))
      {
        posts[index] = metadata;
        log("✅ `posts.json` đã được cập nhật!");
      }
      else{ //
        log("✅ `posts.json` không cần cập nhật!");
        return;
      }
    }
    else{ // bai viet chua ton tai
        log("📂 Đang thêm bài viết moi vào `posts.json`...");
        posts.push(metadata);
        
        console.log("newItem", metadata)
        console.log('posts', posts);
        //posts.push(newItem);
        
}
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

    
        
        //log("📜 Bài viết đã tồn tại trong `posts.json`, không cần cập nhật.");
    
}
// 💾 Lưu bài viết lên GitHub

// Thêm thư viện marked.js để hiển thị Markdown
const loadScript = (url, callback) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
};

loadScript("https://cdn.jsdelivr.net/npm/marked/marked.min.js", () => {
  marked.setOptions({
    gfm: true, // Bật chế độ GitHub Flavored Markdown
    breaks: true, // Xuống dòng với dấu xuống dòng bình thường
    tables: true, // Hỗ trợ bảng
    smartLists: true, // Tự động nhận diện danh sách thông minh
    smartypants: true, // Tự động thay thế dấu nháy & ký tự đặc biệt
});
});




// Xử lý Live Edit
document.getElementById("markdownEditor").addEventListener("input", function () {
    
    updatePreview(this.value);
});

function updatePreview(markdownText){
  marked.setOptions({
    gfm: true, // Bật chế độ GitHub Flavored Markdown
    breaks: true, // Xuống dòng với dấu xuống dòng bình thường
    tables: true, // Hỗ trợ bảng
    smartLists: true, // Tự động nhận diện danh sách thông minh
    smartypants: true, // Tự động thay thế dấu nháy & ký tự đặc biệt
});
  document.getElementById("previewContent").innerHTML = marked.parse(FrontMatter(markdownText));
}
// Hiển thị Editor + Xem trước khi chỉnh sửa bài viết
function lLog(message){
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

  toast.className = "toast red";
  toast.innerText = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";  // Làm mờ trước
    setTimeout(() => toast.remove(), 500); // Xóa sau khi hiệu ứng chạy xong
  }, 2000); // Hiển thị trong 2.5 giây, 0.5 giây fade out
}
log("box-shadow: 0 2px 5px rgba(0,0,0,0.1);")
// Ví dụ sử dụng

