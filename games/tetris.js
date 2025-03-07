// Hiệu ứng khi rơi
function dropPieceSmoothly() {
    currentBlock.y += 1;
    draw();
}

// Hiệu ứng khi xóa dòng
function animateRowClear(rows) {
    rows.forEach(row => {
        for (let col = 0; col < cols; col++) {
            board[row][col].style.animation = "rowClear 0.3s forwards";
        }
    });
    setTimeout(() => {
        rows.forEach(row => {
            board[row].fill(null);
        });
        draw();
    }, 300);
}

// Hiệu ứng xoay
function animateRotate() {
    currentBlock.element.style.animation = "rotatePiece 0.2s ease-in-out";
}

// Hiệu ứng khóa vị trí
function animateLockIn() {
    currentBlock.element.style.animation = "lockIn 0.2s ease-out";
}

// Hiệu ứng xuất hiện khối mới
function animateNewPiece() {
    currentBlock.element.style.animation = "fadeIn 0.3s ease-in";
}

// Gọi hiệu ứng tương ứng khi cần
function rotatePiece() {
    currentBlock.rotate();
    animateRotate();
    draw();
}

function placePiece() {
    animateLockIn();
    setTimeout(() => {
        checkForCompletedRows();
        spawnNewPiece();
        animateNewPiece();
    }, 200);
}

// CSS cho các hiệu ứng
