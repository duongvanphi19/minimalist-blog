document.addEventListener("DOMContentLoaded", () => {
    loadPosts();
    if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }
  
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

});

// 📝 Tải danh sách bài viết từ GitHub
async function loadPosts() {
  console.log("post3.md");
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
        postItem.innerHTML = `<a href="#" onclick="editPost('${post.name}')">${post.name}</a>`;
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
  console.log(head)
  
  return head + content;
}
// Dùng front-matter.js để parse YAML trước khi chuyển Markdown thành HTML



// Khi tải bài viết, parse YAML & Markdown


async function editPost(filename) {
  console.log("editpost")
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

// 💾 Lưu bài viết lên GitHub
async function savePost(filename) {
    function encodeBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}
    const content = document.getElementById("markdownEditor").value;
    
   // console.log(content);// Chuyển Markdown thành Base64
    
    // Cần lấy SHA của file trước khi cập nhật
    const getFileResponse = await fetch(`https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`);
    const fileData = await getFileResponse.json();
    const sha = fileData.sha;
    //alert(sha)

    const data = {
        message: "Cập nhật bài viết",
        content: encodeBase64(content),
        sha: sha
    };
    //console.log(data)
   // const url = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`
    const url = '/.netlify/functions/savePost';
    
    const response = await fetch(url,{
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            //"Authorization": token
        },
        body: JSON.stringify(data)
    });
     console.log('put',response);
     log(response.status+process.env.TOKEN)
    //const result = await response.json();
    //log(result);
    if (response.ok) {
        log("✅ Bài viết đã được cập nhật!");
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

/*loadScript("https://cdn.jsdelivr.net/npm/front-matter@4.0.2/index.min.js", () => {
    console.log("front-matter.js loaded");
});*/

// Xử lý Live Edit
document.getElementById("markdownEditor").addEventListener("input", function () {
    const markdownText = this.value;
    updatePreview(markdownText);
});

function updatePreview(markdownText){
  document.getElementById("previewContent").innerHTML = marked.parse(markdownText);
}
// Hiển thị Editor + Xem trước khi chỉnh sửa bài viết
document.getElementById("editButton").addEventListener("click", () => {
    document.getElementById("editor").classList.remove("hidden");
    document.getElementById("preview").classList.remove("hidden");
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
    errorBox.style.opacity= "95%";
    errorBox.textContent = `${message}`;
    document.body.appendChild(errorBox);

    // Tự động ẩn box lỗi sau 5 giây
    setTimeout(() => {
        errorBox.remove();
    }, 5000);
};

