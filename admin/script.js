// Initialize UI elements when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Initial setup
    const deleteBtn = document.getElementById("deletePostBtn");
    if (deleteBtn) {
        deleteBtn.style.display = "none"; // Ẩn nút xóa mặc định
        deleteBtn.addEventListener("click", deletePost);
    }

    // Setup image upload listeners
    setupImageUploadHandlers();

    // Load posts and setup event listeners
    loadPosts();
    loadImageList();

    // Apply dark mode if enabled
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    // Add event listeners for main actions
    document
        .getElementById("darkModeToggle")
        ?.addEventListener("click", toggleDarkMode);
    document
        .getElementById("newPostButton")
        ?.addEventListener("click", newPost);
});

function setupImageUploadHandlers() {
    const imageUpload = document.getElementById("imageUpload");
    if (!imageUpload) return;

    imageUpload.addEventListener("change", function (event) {
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
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = "block";
            }
        };
        reader.readAsDataURL(file);

        // Cập nhật nội dung checkbox
        const useDefaultNameLabel = document.querySelector(
            "label[for='useDefaultName']",
        );
        if (useDefaultNameLabel) {
            useDefaultNameLabel.innerText = `Sử dụng tên '${file.name}'`;
        }

        // Hiển thị các tùy chọn upload
        const uploadOptions = document.getElementById("uploadOptions");
        if (uploadOptions) {
            uploadOptions.classList.remove("hidden");
        }

        // Set file extension in label
        const extensionLabel = document.getElementById("extensionLabel");
        if (extensionLabel) {
            extensionLabel.innerHTML =
                "." + file.name.split(".").pop().toLowerCase();
        }
    });
}

// Hàm reset khi chọn ảnh khác
function resetUploadForm() {
    const imagePreview = document.getElementById("imagePreview");
    const uploadOptions = document.getElementById("uploadOptions");
    const imageUpload = document.getElementById("imageUpload");

    if (imagePreview) imagePreview.style.display = "none";
    if (uploadOptions) uploadOptions.classList.add("hidden");
    if (imageUpload) imageUpload.value = ""; // Reset input file
}

// Add event listener for upload button
const uploadButton = document.getElementById("uploadButton");
if (uploadButton) {
    uploadButton.addEventListener("click", uploadImage);
}

// Use delegated event listeners for checkbox and image selection
document.addEventListener("click", (e) => {
    // Find the closest relevant element
    const useDefaultName = e.target.closest("#useDefaultName");

    if (useDefaultName) {
        const imageNameInput = document.getElementById("imageNameInput");
        if (imageNameInput) {
            imageNameInput.disabled = useDefaultName.checked;
        }
    }
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
document
    .getElementById("useDefaultName")
    .addEventListener("change", function () {
        const imageNameInput = document.getElementById("imageNameInput");
        imageNameInput.disabled = this.checked;
    });

// Sự kiện xem trước ảnh khi chọn file
document
    .getElementById("imageUpload")
    .addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById("imagePreview");
            preview.src = e.target.result;
            preview.style.display = "block";
        };
        document.getElementById("extensionLabel").innerHTML =
            "." + file.name.split(".").pop().toLowerCase();
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
        log("Vui lòng chọn một ảnh!", "error");
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
        const token = atob(
            "dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==",
        ); // Thay bằng token của bạn (đã mã hóa)
        const repo = "duongvanphi19/minimalist-blog"; // Thay bằng repo của bạn
        const url = `https://api.github.com/repos/${repo}/contents/${filename}`;

        // Kiểm tra xem file đã tồn tại chưa
        let sha = null;
        const checkFile = await fetch(url, {
            headers: { Authorization: token },
        });
        if (checkFile.ok) {
            const fileData = await checkFile.json();
            sha = fileData.sha;
        }

        // Gửi yêu cầu PUT để upload file ảnh
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: "Upload ảnh mới",
                content: base64Content,
                sha: sha || undefined,
            }),
        });

        const result = await response.json();
        if (response.ok) {
            const absoluteUrl = result.content.download_url;
            // Đường dẫn tương đối giả định là phần sau dấu "repos/<repo>/contents"
            const relativeUrl = `/${filename}`;
            log("Ảnh đã được upload thành công!");
            // Hiển thị đường dẫn để người dùng copy
            document.getElementById("uploadPaths").innerHTML = `
        <h3><strong>Path:</strong></h3>
        <p> <input type="text" value="${absoluteUrl}" readonly style="width:100%;"></p>
        </br>
        <p> <input type="text" value="${relativeUrl}" readonly style="width:100%;"></p>
      `;
            // Tự chèn markdown của ảnh vào editor
            //insertImageMarkdown(absoluteUrl);
            document.getElementById("uploadButton").textContent = "Đã tải ảnh len thành công!";
            cacheUploadedImage(filename, content )
            
        } else {
            log("❌ Lỗi khi upload ảnh: " + result.message);
            
        }
    };
}

// Sau khi upload thành công:
function cacheUploadedImage(imagePath, dataUrl) {
  const cacheData = {
    url: dataUrl, // Base64 Data URL
    timestamp: Date.now()
  };
  localStorage.setItem(imagePath, JSON.stringify(cacheData));
  log("cached image");
}

function getImageURL(imagePath) {
  const cached = localStorage.getItem(imagePath);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      // Nếu cached được lưu trong vòng 2 phút, sử dụng cached version
      if (Date.now() - data.timestamp < 2 * 60 * 1000) {
        log("get cached image");
        return data.url;
      }
    } catch (error) {
      console.error("Lỗi parse cached image:", error);
    }
  }
  // Nếu không có cached hoặc đã quá hạn, trả về URL GitHub
  return imagePath;
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

function generateID() {
    return Date.now().toString();
}

function newPost() {
    const title = prompt("nhap title");

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
    const postsFile = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts.json`;
    //const url = '/.netlify/functions/savePost';
    const token = atob(
        "dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==",
    );

    // 🛑 Lấy nội dung hiện tại của `posts.json`
    const response = await fetch(postsFile, {
        headers: { Authorization: token },
    });

    if (!response.ok) {
        log("Lỗi khi tải `posts.json`!");
        return;
    }
    let postsData = await response.json();
    let posts = [];
    //log(decodeBase64(postsData.content))

    try {
        posts = JSON.parse(decodeBase64(postsData.content));
        //console.log('decodeBase64 postsData ok')
    } catch (e) {
        console.log(e);
    }
    console.log(posts);
    filterPosts(posts, "all");
    document.querySelectorAll("input[name='filter']").forEach((radio) => {
        radio.addEventListener("change", (e) => {
            filterPosts(posts, e.target.value);
        });
    });
}
async function loadImageList() {
    const imageDropdown = document.getElementById("coverImageDropdown");
    const preview = document.getElementById("post-cover-image");

    try {
        const response = await fetch("/assets/uploads/"); // 📂 Fetch danh sách ảnh
        if (!response.ok) throw new Error("Không thể tải danh sách ảnh.");

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Lấy danh sách file ảnh từ trang index của thư mục (chỉ hoạt động nếu server hỗ trợ index)
        const images = [...doc.querySelectorAll("a")]
            .map(link => link.getAttribute("href"))
            .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

        imageDropdown.innerHTML = `<option value="">-- Chọn ảnh cover --</option>` + 
            images.map(img => `<option value="${img}">${img}</option>`).join("");

        imageDropdown.addEventListener("change", () => {
            preview.src = imageDropdown.value ? `/assets/uploads/${imageDropdown.value}` : "";
        });

    } catch (error) {
        console.error("Lỗi khi tải danh sách ảnh:", error);
    }
}



function filterPosts(posts, status) {
    const filteredPosts =
        status === "all"
            ? posts
            : posts.filter((post) => post.status === status);

    //console.log(filteredPosts)
    const postList = document.getElementById("blog-list");
    postList.innerHTML = "";
    
    const FPosts = filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    
    FPosts.forEach((post) => {
        const postItem = document.createElement("div");

        postItem.innerHTML = `<span style="margin-right:6px;">${post.status === "published" ? "✅" : "⬜"}</span><a href="#editHere" onclick="editPost('${post.filename}')">${post.filename}</a>`;
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

    lines.forEach((line) => {
        const [key, ...value] = line.split(": ");

        if (key && value.length) {
            let val = value.join(": ").trim();

            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
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
function FrontMatter(markdown) {
    //content = markdown.replace(/^---[\s\S]+?---\s*/, '').trim();
    const { metadata, content } = extractMetadata(markdown);

    const head = `
  # ${metadata.title}
  ![${metadata.title}](../${metadata.image})
  
  `;

    return content;
}

async function editPost(filename, newContent = null) {
    //console.log("editpost")
    const response = await fetch(
        `https://raw.githubusercontent.com/duongvanphi19/minimalist-blog/main/posts/${filename}`,
    );
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
    document.getElementById("deletePostBtn").style.display = "block";
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

    const markdown = document.getElementById("markdownEditor").value;
    const { metadata, content } = extractMetadata(markdown);

    if (!metadata.id) {
        metadata.id = generateID();
    }

    const filename = metadata.slug + ".md";
    const fileUrl = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`;
    const token = atob(
        "dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==",
    );

    let sha = null;
    let fileExists = false;

    try {
        // 🛑 Lấy thông tin file hiện tại
        const getFileResponse = await fetch(fileUrl, {
            headers: { Authorization: `${token}` },
        });

        if (getFileResponse.ok) {
            const fileData = await getFileResponse.json();
            sha = fileData.sha; // Lấy SHA nếu file đã tồn tại
            fileExists = true;
        }
    } catch (error) {
        console.error("❌ Lỗi khi kiểm tra file trên GitHub:", error);
    }
    
    const selectedImage = document.getElementById("coverImageDropdown").value;
metadata.image = selectedImage ? `/assets/uploads/${selectedImage}` : "";

    // 🛑 Tạo nội dung Markdown mới
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
status: "${metadata.status || "draft"}"
---
${content}`;

    // 🛑 Chuẩn bị dữ liệu cập nhật
    const data = {
        message: fileExists ? "Cập nhật bài viết" : "Tạo bài viết mới",
        content: encodeBase64(newContent),
        ...(fileExists && { sha }), // Chỉ gửi `sha` nếu file đã tồn tại
    };

    try {
        // 🛑 Gửi yêu cầu cập nhật hoặc tạo mới file
        const response = await fetch(fileUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `${token}`,
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            log(
                `${fileExists ? "Bài viết đã được cập nhật!" : "Bài viết mới đã được tạo!"}`,
                "success",
            );
            document.getElementById("markdownEditor").value = newContent;

            // 🛑 Cập nhật `posts.json`
            try {
                await updatePostsJson(filename, metadata);
            } catch (error) {
                console.error("Lỗi khi cập nhật `posts.json`:", error);
            }
        } else {
            const errorResponse = await response.json();
            log(`Lỗi khi lưu bài viết: ${errorResponse.message}`, "error");
        }
    } catch (error) {
        log(" Lỗi khi gửi yêu cầu đến GitHub!", "error");
        console.error("Lỗi khi lưu bài viết:", error);
    }
}

// 🛑 Hàm kiểm tra file có tồn tại trên GitHub không
async function checkFileExists(filename) {
    const fileUrl = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`;
    const token = atob(
        "dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==",
    );

    try {
        const response = await fetch(fileUrl, {
            headers: { Authorization: token },
        });
        return response.ok; // Trả về `true` nếu file tồn tại, `false` nếu không
    } catch (error) {
        console.error("Lỗi khi kiểm tra file trên GitHub:", error);
        return false;
    }
}

async function updatePostsJson(filename, metadata) {
    const postsFile =
        "https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts.json";
    const token = atob(
        "dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==",
    );

    try {
        // 🛑 Lấy nội dung hiện tại của `posts.json`
        const response = await fetch(postsFile, {
            headers: { Authorization: token },
        });

        if (!response.ok) {
            log("Lỗi khi tải `posts.json`!", "error");
            return;
        }

        const postsData = await response.json();
        let posts = [];

        // Kiểm tra nội dung có hợp lệ trước khi parse
        if (postsData.content) {
            try {
                posts = JSON.parse(decodeBase64(postsData.content));
            } catch (e) {
                log("Lỗi khi parse JSON!", "error");
                return;
            }
        }

        // 🛑 Kiểm tra bài viết
        const index = posts.findIndex((post) => post.id === metadata.id);
        const exists = index !== -1;

        if (exists) {
            if (JSON.stringify(posts[index]) !== JSON.stringify(metadata)) {
                posts[index] = metadata;
                log("Cập nhật bài viết trong `posts.json`!", "success");
            } else {
                log("Không có thay đổi, không cập nhật.");
                return;
            }
        } else {
            log("Thêm bài viết mới vào `posts.json`!", "success");
            posts.push(metadata);
        }

        // ✅ Mã hóa JSON & cập nhật lên GitHub
        const updatedPosts = encodeBase64(JSON.stringify(posts, null, 2));

        const updateResponse = await fetch(postsFile, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: token,
            },
            body: JSON.stringify({
                message: "Cập nhật danh sách bài viết",
                content: updatedPosts,
                sha: postsData.sha,
            }),
        });

        if (updateResponse.ok) {
            log("`posts.json` đã được cập nhật thành công!", "success");
        } else {
            log("Lỗi khi cập nhật `posts.json`!", "error");
        }
    } catch (error) {
        console.error("Lỗi trong `updatePostsJson()`:", error);
    }
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
document
    .getElementById("markdownEditor")
    .addEventListener("input", function () {
        clearTimeout(timeout);
        timeout = setTimeout(updatePreview, 300); // Chờ 300ms trước khi cập nhật
    });

function updatePreview() {
    const markdownText = document.getElementById("markdownEditor").value;
    const {metadata, content} = extractMetadata(markdownText);
    let cover = document.getElementById("cover");
    cover.innerHTML = marked.parse(`![${metadata.slug}](${getImageURL(metadata.image)})`)
    log(getImageURL(metadata.image))
    document.getElementById("previewContent").innerHTML = marked.parse(
  content);

}
// Hiển thị Editor + Xem trước khi chỉnh sửa bài viết

function log(message, type = "") {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    if (type === "error") {
        toast.innerText = `⛔ ${message}`;
    } else if (type === "success") {
        toast.innerText = `✅ ${message}`;
    } else {
        toast.innerText = `ℹ️ ${message}`;
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0"; // Làm mờ trước
        setTimeout(() => toast.remove(), 500); // Xóa sau khi hiệu ứng chạy xong
    }, 4500); // Hiển thị trong 2.5 giây, 0.5 giây fade out
}
//log("box-sh adow: 0 2px 5px ,0,0.1);", "error")
//log("box-sh adow: 0 2px 5px ,0,0.1);", "success")
//log("box-sh adow: 0 2px 5px ,0,0.1);", "")

async function deletePost() {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;

    const markdown = document.getElementById("markdownEditor").value;
    const { metadata, content } = extractMetadata(markdown);

    if (!metadata || !metadata.filename) {
        log("Lỗi: Không tìm thấy bài viết cần xóa!", "error");
        return;
    }

    const filename = metadata.filename; // Lấy tên file từ metadata
    const fileUrl = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`;
    const token = atob(
        "dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==",
    );

    try {
        // 🛑 Lấy SHA của file trước khi xóa
        const getFileResponse = await fetch(fileUrl, {
            headers: { Authorization: token },
        });

        if (!getFileResponse.ok) {
            log("Lỗi: Không tìm thấy file cần xóa!", "error");
            return;
        }

        const fileData = await getFileResponse.json();
        const sha = fileData.sha;

        // 🛑 Gửi yêu cầu xóa file trên GitHub
        const deleteResponse = await fetch(fileUrl, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: token,
            },
            body: JSON.stringify({
                message: `Xóa bài viết: ${metadata.slug}`,
                sha: sha,
            }),
        });

        if (deleteResponse.ok) {
            log("Bài viết đã bị xóa!", "success");

            // 🛑 Cập nhật `posts.json` để loại bỏ bài viết đã xóa
            try {
                await removeFromPostsJson(metadata.id);
            } catch (error) {
                console.error("Lỗi khi cập nhật posts.json:", error);
            }

            // Xóa nội dung editor
            document.getElementById("markdownEditor").value = "";
            document.getElementById("deletePostBtn").style.display = "none";
        } else {
            const errorResponse = await deleteResponse.json();
            log(`Lỗi khi xóa bài viết: ${errorResponse.message}`, "error");
        }
    } catch (error) {
        console.error("Lỗi khi xóa bài viết:", error);
        log("Lỗi khi gửi yêu cầu xóa bài viết!", "error");
    }
}

async function removeFromPostsJson(postId) {
    const postsFile =
        "https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts.json";
    const token = atob(
        "dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==",
    );

    try {
        const postsResponse = await fetch(postsFile, {
            headers: { Authorization: token },
        });

        if (!postsResponse.ok) {
            log("Lỗi khi tải `posts.json`!", "error");
            return;
        }

        const postsData = await postsResponse.json();
        let posts = JSON.parse(decodeBase64(postsData.content));

        // 🛑 Xóa bài viết khỏi danh sách
        posts = posts.filter((post) => post.id !== postId);

        // 🛑 Mã hóa lại JSON và cập nhật lên GitHub
        const updatedPosts = encodeBase64(JSON.stringify(posts, null, 2));

        const updateResponse = await fetch(postsFile, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: token,
            },
            body: JSON.stringify({
                message: "Xóa bài viết khỏi danh sách",
                content: updatedPosts,
                sha: postsData.sha,
            }),
        });

        if (updateResponse.ok) {
            log("`posts.json` đã được cập nhật!", "success");
        } else {
            log("Lỗi khi cập nhật `posts.json`!", "error");
        }
    } catch (error) {
        console.error("Lỗi khi cập nhật `posts.json`:", error);
    }
}
async function UpdatePostsJson(filename, metadata) {
    const postsFile =
        "https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts.json";
    const token = atob(
        "dG9rZW4gZ2hwX0xreG5ZWDJaWVpqNkRicE1zZ2kwZ2kzSnNXSkw5UjEySEtiVw==",
    );

    try {
        // 🛑 Lấy nội dung hiện tại của `posts.json`
        const postsData = await fetchPostsJson(postsFile, token);
        if (!postsData) return;

        let posts = parsePostsJson(postsData.content);
        if (!posts) return;

        // 🛑 Kiểm tra xem bài viết có tồn tại hay không
        const index = posts.findIndex((post) => post.id === metadata.id);
        const exists = index !== -1;

        if (exists) {
            if (hasPostChanged(posts[index], metadata)) {
                posts[index] = metadata;
                log("🔄 Cập nhật bài viết trong `posts.json`!", "success");
            } else {
                log("✅ Không có thay đổi, không cập nhật.");
                return;
            }
        } else {
            log("🆕 Thêm bài viết mới vào `posts.json`!", "success");
            posts.push(metadata);
        }

        // ✅ Mã hóa JSON & cập nhật lên GitHub
        await updatePostsJsonOnGitHub(postsFile, token, posts, postsData.sha);
    } catch (error) {
        console.error("❌ Lỗi trong `updatePostsJson()`:", error);
    }
}

async function fetchPostsJson(postsFile, token) {
    try {
        const response = await fetch(postsFile, {
            headers: { Authorization: `${token}` },
        });

        if (!response.ok) {
            log("⚠️ Lỗi khi tải `posts.json`!", "error");
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("❌ Lỗi khi lấy `posts.json`:", error);
        return null;
    }
}

function parsePostsJson(content) {
    try {
        return JSON.parse(decodeBase64(content));
    } catch (error) {
        log("❌ Lỗi khi parse `posts.json`!", "error");
        return null;
    }
}

function hasPostChanged(oldPost, newPost) {
    return JSON.stringify(oldPost) !== JSON.stringify(newPost);
}
async function updatePostsJsonOnGitHub(postsFile, token, posts, sha) {
    try {
        const updatedPosts = encodeBase64(JSON.stringify(posts, null, 2));

        const response = await fetch(postsFile, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `${token}`,
            },
            body: JSON.stringify({
                message: "📜 Cập nhật danh sách bài viết",
                content: updatedPosts,
                sha: sha,
            }),
        });

        if (response.ok) {
            log("✅ `posts.json` đã được cập nhật thành công!", "success");
        } else {
            log("❌ Lỗi khi cập nhật `posts.json`!", "error");
        }
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật `posts.json` trên GitHub:", error);
    }
}
