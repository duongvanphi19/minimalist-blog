

document.getElementById("imageUpload").addEventListener("change", function (event) {
    const file = event.target.files[0];

    // Nếu không chọn file thì reset lại toàn bộ
    if (!file) {
        resetUploadForm();
        return;
    }

    // Hiển thị ảnh preview
    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById("imagePreview");
        preview.src = e.target.result;
        preview.style.display = "block";
    };
    reader.readAsDataURL(file);

    // Cập nhật nội dung checkbox
    const useDefaultNameLabel = document.querySelector("label[for='useDefaultName']");
    useDefaultNameLabel.innerText = `Sử dụng tên '${file.name}'`;

    // Hiển thị các tùy chọn upload
    document.getElementById("uploadOptions").classList.remove("hidden");
});

// Hàm reset khi chọn ảnh khác
function resetUploadForm() {
    document.getElementById("imagePreview").style.display = "none";
    document.getElementById("uploadOptions").classList.add("hidden");
    document.getElementById("imageUpload").value = ""; // Reset input file
}

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

// Sự kiện checkbox: nếu được chọn, disable input tên ảnh
document.getElementById("useDefaultName").addEventListener("change", function () {
  const imageNameInput = document.getElementById("imageNameInput");
  imageNameInput.disabled = this.checked;
});

// Sự kiện xem trước ảnh khi chọn file
document.getElementById("imageUpload").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const preview = document.getElementById("imagePreview");
    preview.src = e.target.result;
    preview.style.display = "block";
  };
  document.getElementById("extensionLabel").innerHTML= "." + file.name.split(".").pop().toLowerCase();
  reader.readAsDataURL(file);
});

// Hàm tạo slug từ chuỗi (loại bỏ dấu, chuyển thành chữ thường, đổi khoảng trắng thành dấu -)
function createSlug(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Sự kiện nút upload ảnh
document.getElementById("uploadButton").addEventListener("click", uploadImage);

async function uploadImage() {
  const fileInput = document.getElementById("imageUpload");
  const file = fileInput.files[0];
  if (!file) {
    log("❌ Vui lòng chọn một ảnh!");
    return;
  }
  
  document.getElementById("uploadButton").textContent = "Uploading...";

  // Lấy extension của file
  const extension = file.name.split(".").pop().toLowerCase();
  
  // Nếu checkbox "useDefaultName" được check, dùng tên file gốc (đã chuyển slug)
  // Ngược lại, lấy tên từ input (và chuyển slug)
 
  let baseName = "";
  if (document.getElementById("useDefaultName").checked) {
    baseName = file.name.substring(0, file.name.lastIndexOf("."));
  } else {
    baseName = document.getElementById("imageNameInput").value;
    if (!baseName) {
      log("❌ Vui lòng nhập tên ảnh!");
      return;
    }
  }
  const slugName = createSlug(baseName);
  const filename = `assets/uploads/${slugName}.${extension}`;

  // Đọc file và chuyển thành Base64
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async function () {
    const base64Content = reader.result.split(",")[1]; // Lấy phần dữ liệu base64 sau dấu ,

    // Cấu hình thông tin GitHub
    const token = atob("dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw=="); // Thay bằng token của bạn (đã mã hóa)
    const repo = "duongvanphi19/minimalist-blog"; // Thay bằng repo của bạn
    const url = `https://api.github.com/repos/${repo}/contents/${filename}`;

    // Kiểm tra xem file đã tồn tại chưa
    let sha = null;
    const checkFile = await fetch(url, { headers: { Authorization: token } });
    if (checkFile.ok) {
      const fileData = await checkFile.json();
      sha = fileData.sha;
    }

    // Gửi yêu cầu PUT để upload file ảnh
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
      const absoluteUrl = result.content.download_url;
      // Đường dẫn tương đối giả định là phần sau dấu "repos/<repo>/contents"
      const relativeUrl = `/${filename}`;
      log("✅ Ảnh đã được upload thành công!");
      // Hiển thị đường dẫn để người dùng copy
      document.getElementById("uploadPaths").innerHTML = `
        <h3><strong>Path:</strong></h3>
        <p> <input type="text" value="${absoluteUrl}" readonly style="width:100%;"></p>
        <p> <input type="text" value="${relativeUrl}" readonly style="width:100%;"></p>
      `;
      // Tự chèn markdown của ảnh vào editor
      //insertImageMarkdown(absoluteUrl);
      document.getElementById("uploadButton").textContent = "✅"
    } else {
      log("❌ Lỗi khi upload ảnh: " + result.message);
    }
  };
}

// Hàm chèn markdown của ảnh vào vị trí con trỏ trong editor
function insertImageMarkdown(imageUrl) {
  const editor = document.getElementById("markdownEditor");
  const cursorPos = editor.selectionStart;
  const textBefore = editor.value.substring(0, cursorPos);
  const textAfter = editor.value.substring(cursorPos);
  editor.value = `${textBefore} ![Hình ảnh](${imageUrl}) ${textAfter}`;
  updatePreview();
}

// Hàm cập nhật preview sử dụng marked.js (đã được load từ CDN)

function insertImageMarkdown(imageUrl) {
    const editor = document.getElementById("markdownEditor");
    const cursorPos = editor.selectionStart;
    const textBefore = editor.value.substring(0, cursorPos);
    const textAfter = editor.value.substring(cursorPos);
    editor.value = `${textBefore} ![Hình ảnh](${imageUrl}) ${textAfter}`;
    updatePreview();
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
    const title = "new";

    const slug = createSlug(title);
    const content = `---
id: ""
title: "${title}"
date: "${new Date().toISOString().split("T")[0]}"
author: ""
description: "Lorem ipsum dolor sit atmet"
tags: []
image: "/assets/uploads/sample.jpg"
featured: "false"
slug: "${slug}"
filename: "${slug}.md"
status: "published"
---

Nội dung bài viết tại đây...
`;

    document.getElementById("markdownEditor").value = content;
    document.getElementById("editor").style.display = "block";
    
    updatePreview();

    document.getElementById("saveButton").onclick = () => savePost();
}

// 📝 Tải danh sách bài viết từ GitHub

async function loadPosts() {
  
    const postsFile = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts.json`
    //const url = '/.netlify/functions/savePost';
    const token = atob("dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==")

    // 🛑 Lấy nội dung hiện tại của `posts.json`
    const response = await fetch(postsFile, { headers: { Authorization: token } });

    if (!response.ok) {
        log("⛔ Lỗi khi tải `posts.json`!");
        return;
    }
    let postsData = await response.json();
    let posts =[];
    //log(decodeBase64(postsData.content))
    
    try{ 
      posts = JSON.parse(decodeBase64(postsData.content));
    //console.log('decodeBase64 postsData ok')
    }catch(e){
      console.log(e)
    }
    console.log(posts)
    filterPosts(posts, "all");
    document.querySelectorAll("input[name='filter']").forEach(radio => {
            radio.addEventListener("change", (e) => {
                filterPosts(posts,e.target.value);
            });       
}); 
    
}


function filterPosts(posts, status) {
     
            const filteredPosts = status === "all" ? posts : posts.filter(post => post.status === status);
          
           //console.log(filteredPosts)
           const postList = document.getElementById("blog-list");
        postList.innerHTML = "";
        filteredPosts.forEach(post => {
        const postItem = document.createElement("div");
        
        postItem.innerHTML = `<span style="margin-right:6px;">${post.status === "published" ? '✅' : '⬜'}</span><a href="#editHere" onclick="editPost('${post.filename}')">${post.filename}</a>`;
        postList.appendChild(postItem);
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
  
    document.getElementById("markdownEditor").value = markdown;
    updatePreview();
    document.getElementById("editor").style.display = "block";
    document.getElementById("saveButton").onclick = () => savePost();
}

function encodeBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(base64Str) {
    return decodeURIComponent(escape(atob(base64Str)));
}

async function savePost() {
    function encodeBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }
    const markdown = document.getElementById("markdownEditor").value
    const { metadata, content } = extractMetadata(markdown);
    filename = metadata.slug + ".md"
    //sua metadata 
    // Nếu chưa có id, tạo mới
    if (!metadata.id) {
        metadata.id = generateID();
    }
    //metadata.filename=filename
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
filename: "${metadata.slug}.md"
status: "${metadata.status}"
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
        log(`✅ ${fileExists ? "Bài viết đã được cập nhật!" : "Bài viết mới đã được tạo!"}`,"success");
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
            featured: metadata.featured,
            status: metadata.status
        }
    //console.log(JSON.stringify(posts, null,2));
    const exists = posts.some(post => post.id === metadata.id);
    const index = posts.findIndex(post => post.id === metadata.id)
    

    //console.log(posts[0].filename, newItem.filename)
    
    if (exists && metadata.slug === posts[index].slug) { //can cap nhat
      if (JSON.stringify(posts[index]) !== JSON.stringify(metadata) )//co thay doi
      {
        posts[index] = metadata;
        log("✅ `posts.json` đã được cập nhật!", "success")
      }
      else{ //
        log(" `posts.json` không cần cập nhật!")
        return;
      }
    }
    else{ 
      
      // bai viet chua ton tai
        log("📂 Đang thêm bài viết moi vào `posts.json`...", "success");
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
let timeout;
document.getElementById("markdownEditor").addEventListener("input", function () {
    clearTimeout(timeout);
    timeout = setTimeout(updatePreview, 300); // Chờ 300ms trước khi cập nhật
});

function updatePreview(){
  
  const markdownText = document.getElementById("markdownEditor").value;
  document.getElementById("previewContent").innerHTML = marked.parse(FrontMatter(markdownText));
}
// Hiển thị Editor + Xem trước khi chỉnh sửa bài viết

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
log("box-sh adow: 0 2px 5px ,0,0.1);", "error")
log("box-sh adow: 0 2px 5px ,0,0.1);", "success")
log("box-sh adow: 0 2px 5px ,0,0.1);", "")

