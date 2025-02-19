// netlify/functions/savePost.js

const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  // Lấy token từ biến môi trường đã được cấu hình trong Netlify
  const token = process.env.TOKEN;
  log(token);
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing TOKEN environment variable." })
    };
  }

  // Parse request body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid request body" })
    };
  }

  const { filename, message, content, sha } = data;
  if (!filename || !message || !content) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields (filename, message, content)" })
    };
  }

  // Chuẩn bị dữ liệu commit (GitHub yêu cầu content phải được mã hóa Base64)
  const payload = {
    message: message,
    content: content, // Phía client cần mã hóa Base64 đúng chuẩn UTF-8 trước khi gửi
    sha: sha // Có thể bỏ qua nếu file không tồn tại, GitHub sẽ tạo file mới
  };

  try {
    const apiUrl = `https://api.github.com/repos/duongvanphi19/minimalist-blog/contents/posts/${filename}`;
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: result.message })
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.toString() })
    };
  }
};

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

