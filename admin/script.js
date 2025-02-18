document.addEventListener("DOMContentLoaded", () => {
    loadPosts();
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
  const filename = "post3.md"
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

// ✏️ Chỉnh sửa bài viết
async function editPost(filename) {
    const response = await fetch(`https://raw.githubusercontent.com/duongvanphi19/minimalist-blog/main/posts/${filename}`);
    //console.log(response)
    if (!response.ok) {
        console.error("Không thể tải bài viết.");
        return;
    }
    const markdown = await response.text();
    
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
    console.log(data)

    const response = await fetch(`https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`,{
        method: "PUT",
        headers: {
            "Authorization": window.API_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    //console.log("put",response)

    if (response.ok) {
        alert("Bài viết đã được cập nhật!");
    } else {
        alert("Lỗi khi lưu bài viết.");
    }
}