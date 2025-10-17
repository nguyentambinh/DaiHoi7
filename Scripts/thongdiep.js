// === Cấu hình font chữ, cỡ chữ, màu sắc, vị trí ===
const FONT_CONFIG = {
    ten: {
        family: "Roboto",
        size: 75,
        weight: "700",
        color: "#2f67b8",
        x: 2150,
        y: 1560,
        maxWidthTen: 650,
        rotation: 1.5 // THÊM MỚI: Góc xoay cho Tên (tính bằng độ)
    },
    chucvu: {
        family: "Roboto",
        size: 50,
        weight: "700",
        color: "#2f67b8",
        x: 2150,
        y: 1670,
        maxWidth: 650,
        lineHeight: 60,
        maxLinesChucVu: 2,
        rotation: 1.5 // THÊM MỚI: Góc xoay cho Chức vụ (tính bằng độ)
    },
    noidung: {
        family: "Roboto",
        size: 70,
        weight: "500",
        color: "#2f67b8",
        x: 330,
        y: 720,
        maxWidth: 1560,
        lineHeight: 90,
        maxLines: 11
    }
};

// === Cấu hình Ảnh nền và Ảnh người gửi ===
const IMAGE_CONFIG = {
    baseWidth: 3000,
    baseHeight: 2000,
    bg: {
        path: "/Content/images/bgLoiChuc.png"
    },
    user: {
        x: 2150,
        y: 680,
        w: 650,
        h: 780,
        rotation: 1.5,
        imgX: 0,
        imgY: 0,
        imgScale: 1,
        originalImg: null,
        // CẤU HÌNH MỚI: Cho viền
        border: {
            width: 5,
            colorLight: "#3CA9E5",
            colorNormal: "#2B78D0"
        }
    }
};

// === Biến toàn cục để lưu trạng thái kéo/thả/xoay ===
let isDragging = false;
let startDragX, startDragY;

// *** BIẾN QUAN TRỌNG CHO INTERACTION ***
let currentRotation = IMAGE_CONFIG.user.rotation * (Math.PI / 180); // Xoay khung (cố định theo config)
let currentImgScale = IMAGE_CONFIG.user.imgScale;
let currentImgX = IMAGE_CONFIG.user.imgX;
let currentImgY = IMAGE_CONFIG.user.imgY;
let currentOriginalImg = IMAGE_CONFIG.user.originalImg;
let canvas;

// === BIẾN MỚI CHO MULTI-TOUCH ===
let touchStartX, touchStartY;
let lastPinchDist = null; // Khoảng cách giữa 2 ngón tay lần cuối
let lastAngle = null;      // Góc giữa 2 ngón tay lần cuối
let currentImgInternalRotation = 0; // Góc xoay của ảnh BÊN TRONG khung (cho pinch rotation)

// === Helper lấy tọa độ, khoảng cách, góc ===
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function getTouchPos(touch, rect, scaleX, scaleY) {
    return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
    };
}

function getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getAngle(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}
// ============================================

// === Helper lấy dữ liệu Base64 của ảnh Canvas (Giữ lại cho nút Tải ảnh) ===
function getGeneratedImageBase64(canvas) {
    return canvas.toDataURL("image/png");
}

// === HÀM MỚI: Chuyển đổi Canvas thành Blob (File object) ===
function canvasToBlob(canvas) {
    return new Promise(resolve => {
        // 'image/png' là định dạng, 1.0 là chất lượng
        canvas.toBlob(resolve, 'image/png', 1.0);
    });
}

// === DOMContentLoaded: xử lý input và nút tải ảnh ===
document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("previewCanvas");
    const form = document.getElementById("formThongDiep");

    const btnDownload = document.getElementById("btnTaiAnh");
    const inputs = ["TenNguoiGui", "ChucVu", "NoiDung"];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("input", taoAnh);
    });

    const hinhAnhInput = document.getElementById("HinhAnh");
    if (hinhAnhInput) {
        hinhAnhInput.addEventListener("change", handleImageUpload);
    }

    if (btnDownload) {
        // CHỨC NĂNG TẢI VỀ MÁY (CLIENT-SIDE)
        btnDownload.addEventListener("click", async () => {
            const canvasResult = await taoAnh();
            const link = document.createElement("a");
            link.download = "loi_gui_dai_hoi.png";
            link.href = canvasResult.toDataURL("image/png");
            link.click();
        });
    }

    // === XỬ LÝ SỰ KIỆN SUBMIT FORM BẰNG AJAX (THAY THẾ LOGIC CŨ) ===
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (!canvas) {
                console.error("Lỗi: Không tìm thấy Canvas để tạo ảnh.");
                return;
            }

            // Tìm nút submit để vô hiệu hóa
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = "Đang gửi...";

            try {
                // 1. Tạo ảnh cuối cùng
                const canvasResult = await taoAnh();

                // 2. Chuyển Canvas thành Blob
                const imageBlob = await canvasToBlob(canvasResult);

                // 3. Chuẩn bị FormData
                const formData = new FormData();

                // Thêm các trường text vào FormData
                formData.append("TenNguoiGui", document.getElementById("TenNguoiGui").value);
                formData.append("ChucVu", document.getElementById("ChucVu").value);
                formData.append("NoiDung", document.getElementById("NoiDung").value);

                // Thêm Blob ảnh vào FormData, đặt tên là 'GeneratedImageFile'
                formData.append("GeneratedImageFile", imageBlob, "thong_diep.png");

                // Thêm token chống giả mạo
                const antiForgeryToken = form.querySelector('input[name="__RequestVerificationToken"]')?.value;
                if (antiForgeryToken) {
                    formData.append("__RequestVerificationToken", antiForgeryToken);
                }

                // 4. Gửi dữ liệu bằng fetch API
                const response = await fetch(form.action, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }, // Cần loại bỏ headers: {'Content-Type': 'application/json'} khi gửi FormData
                    body: formData
                });

                if (response.ok) {
                    // Nếu gửi thành công, tải lại trang để hiển thị thông báo TempData
                    window.location.href = form.action;
                } else {
                    console.error("Gửi thất bại. Lỗi server:", response.statusText);
                    // Có thể hiển thị message box lỗi tại đây
                }

            } catch (error) {
                console.error("Lỗi gửi thông điệp:", error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Gửi thông điệp";
            }
        });
    }
    // ==================================================

    // Thiết lập sự kiện chuột/touch cho canvas để tương tác với ảnh người dùng
    if (canvas) {
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseout', handleMouseUp);
        canvas.addEventListener('wheel', handleMouseWheel);

        // Hỗ trợ cảm ứng (ĐÃ SỬA CHO MULTI-TOUCH)
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);
    }

    // Đảm bảo xoay khung được áp dụng khi tải trang
    taoAnh();
});

// === Hàm xử lý upload ảnh ===
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const img = await loadImage(URL.createObjectURL(file));
        currentOriginalImg = img;

        // Reset crop/zoom/rotation nội bộ khi tải ảnh mới
        currentImgScale = 1;
        currentImgInternalRotation = 0; // Reset internal rotation

        // GIỮ LẠI GÓC XOAY KHUNG TỪ CONFIG
        currentRotation = IMAGE_CONFIG.user.rotation * (Math.PI / 180);

        // Tính toán vị trí ban đầu để ảnh nằm gọn trong khung (hoặc phủ kín)
        const frameRatio = IMAGE_CONFIG.user.w / IMAGE_CONFIG.user.h;
        const imgRatio = img.width / img.height;

        if (imgRatio > frameRatio) { // Ảnh rộng hơn khung
            currentImgScale = IMAGE_CONFIG.user.h / img.height;
            currentImgX = (IMAGE_CONFIG.user.w - img.width * currentImgScale) / 2;
            currentImgY = 0;
        } else { // Ảnh cao hơn hoặc tỉ lệ bằng khung
            currentImgScale = IMAGE_CONFIG.user.w / img.width;
            currentImgX = 0;
            currentImgY = (IMAGE_CONFIG.user.h - img.height * currentImgScale) / 2;
        }

        taoAnh();
    } else {
        currentOriginalImg = null;
        currentImgInternalRotation = 0; // Reset internal rotation
        // Reset rotation về giá trị mặc định của config khi không có ảnh
        currentRotation = IMAGE_CONFIG.user.rotation * (Math.PI / 180);
        taoAnh();
    }
}


// === Hàm xử lý sự kiện chuột (kéo, xoay, zoom) ===

// Hàm này cần được sửa lại để tính toán vị trí chuột trong khung đã xoay
function isMouseOverUserImageFrame(mouseX, mouseY, scaleX, scaleY) {
    const frameX = IMAGE_CONFIG.user.x * scaleX;
    const frameY = IMAGE_CONFIG.user.y * scaleY;
    const frameW = IMAGE_CONFIG.user.w * scaleX;
    const frameH = IMAGE_CONFIG.user.h * scaleY;

    // --- LOGIC KIỂM TRA CHUỘT TRONG KHUNG XOAY ---
    const centerX = frameX + frameW / 2;
    const centerY = frameY + frameH / 2;
    const rotation = currentRotation; // Lấy góc xoay (radian)

    // 1. Dịch chuyển tọa độ chuột về tâm
    const translatedX = mouseX - centerX;
    const translatedY = mouseY - centerY;

    // 2. Xoay ngược tọa độ chuột lại
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;

    // 3. Kiểm tra xem tọa độ đã xoay ngược có nằm trong khung chưa xoay
    const checkRotatedX = rotatedX + frameW / 2; // Tọa độ trong khung chưa xoay, với (0,0) là góc trên bên trái
    const checkRotatedY = rotatedY + frameH / 2;

    return checkRotatedX >= 0 && checkRotatedX <= frameW &&
        checkRotatedY >= 0 && checkRotatedY <= frameH;
}

function handleMouseDown(e) {
    e.preventDefault();
    const pos = getMousePos(e);
    // Vị trí chuột được kiểm tra dựa trên tọa độ đã scale (tọa độ hiển thị)
    if (isMouseOverUserImageFrame(pos.x, pos.y, canvas.width / IMAGE_CONFIG.baseWidth, canvas.height / IMAGE_CONFIG.baseHeight) && currentOriginalImg) {
        isDragging = true;
        startDragX = pos.x;
        startDragY = pos.y;
    }
}

function handleMouseMove(e) {
    if (!isDragging || !currentOriginalImg) return;
    e.preventDefault();

    const pos = getMousePos(e);
    const deltaX = pos.x - startDragX;
    const deltaY = pos.y - startDragY;

    const currentScaleX = canvas.width / IMAGE_CONFIG.baseWidth;

    // *** SỬA LỖI KÉO KHI KHUNG BÊN NGOÀI ĐÃ XOAY ***
    const rotation = currentRotation;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    // Xoay vector di chuyển (delta)
    const rotatedDeltaX = (deltaX * cos - deltaY * sin) / currentScaleX;
    const rotatedDeltaY = (deltaX * sin + deltaY * cos) / currentScaleX;

    currentImgX += rotatedDeltaX;
    currentImgY += rotatedDeltaY;
    // **********************************************

    startDragX = pos.x;
    startDragY = pos.y;

    taoAnh();
}

function handleMouseUp() {
    isDragging = false;
}

// Logic MouseWheel (Zoom) cần được sửa lại để lấy điểm zoom chính xác
function handleMouseWheel(e) {
    if (!currentOriginalImg) return;
    e.preventDefault(); // Luôn ngăn chặn hành vi cuộn mặc định của trình duyệt

    const pos = getMousePos(e);
    if (!isMouseOverUserImageFrame(pos.x, pos.y, canvas.width / IMAGE_CONFIG.baseWidth, canvas.height / IMAGE_CONFIG.baseHeight)) {
        return;
    }

    // === BỔ SUNG LOGIC XOAY KHI GIỮ PHÍM SHIFT ===
    if (e.shiftKey) {
        const rotationStep = 5 * (Math.PI / 180); // 5 độ đổi sang radian
        if (e.deltaY < 0) {
            // Cuộn lên (deltaY < 0) -> Xoay theo chiều kim đồng hồ (Góc dương)
            currentImgInternalRotation += rotationStep;
        } else {
            // Cuộn xuống (deltaY > 0) -> Xoay ngược chiều kim đồng hồ (Góc âm)
            currentImgInternalRotation -= rotationStep;
        }
        taoAnh();
        return; // Dừng lại, không thực hiện zoom
    }
    // === KẾT THÚC LOGIC XOAY ===


    const scaleAmount = 0.1;
    const oldScale = currentImgScale;

    if (e.deltaY < 0) {
        currentImgScale += scaleAmount;
    } else {
        currentImgScale -= scaleAmount;
        if (currentImgScale < 0.1) currentImgScale = 0.1;
    }

    const ratio = currentImgScale / oldScale;

    const currentScaleX = canvas.width / IMAGE_CONFIG.baseWidth;
    const currentScaleY = canvas.height / IMAGE_CONFIG.baseHeight;
    const rotation = currentRotation;

    // Tọa độ khung ảnh gốc (base coords)
    const frameXBase = IMAGE_CONFIG.user.x;
    const frameYBase = IMAGE_CONFIG.user.y;
    const frameWBase = IMAGE_CONFIG.user.w;
    const frameHBase = IMAGE_CONFIG.user.h;

    // --- LOGIC TÍNH ĐIỂM CHUỘT ĐÃ XOAY NGƯỢC ---
    const centerX = (frameXBase + frameWBase / 2) * currentScaleX;
    const centerY = (frameYBase + frameHBase / 2) * currentScaleY;

    const translatedX = pos.x - centerX;
    const translatedY = pos.y - centerY;

    // Xoay ngược tọa độ chuột về hệ tọa độ của ảnh (đã bỏ xoay khung)
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;

    // Tọa độ chuột trong hệ tọa độ gốc của khung ảnh user (base coords)
    // Tính tọa độ chuột tương đối với góc trên bên trái của khung ảnh user (base coords)
    const mouseXBase = (rotatedX / currentScaleX) + (frameWBase / 2);
    const mouseYBase = (rotatedY / currentScaleY) + (frameHBase / 2);
    // --- KẾT THÚC LOGIC TÍNH ĐIỂM CHUỘT ĐÃ XOAY NGƯỢC ---

    // Áp dụng công thức zoom dựa trên điểm chuột tương đối so với khung
    currentImgX = mouseXBase - (mouseXBase - currentImgX) * ratio;
    currentImgY = mouseYBase - (mouseYBase - currentImgY) * ratio;

    taoAnh();
}


// === HÀM XỬ LÝ TOUCH (PAN, PINCH-ZOOM, ROTATE) ===

function handleTouchStart(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Lấy vị trí touch 1
    const pos1 = getTouchPos(e.touches[0], rect, scaleX, scaleY);

    // Kiểm tra touch có nằm trong khung ảnh người dùng không
    if (!isMouseOverUserImageFrame(pos1.x, pos1.y, canvas.width / IMAGE_CONFIG.baseWidth, canvas.height / IMAGE_CONFIG.baseHeight) || !currentOriginalImg) {
        isDragging = false;
        lastPinchDist = null;
        lastAngle = null;
        return;
    }

    if (e.touches.length === 2) {
        // MULTI-TOUCH: Bắt đầu zoom và xoay
        isDragging = false;
        const pos2 = getTouchPos(e.touches[1], rect, scaleX, scaleY);

        lastPinchDist = getDistance(pos1, pos2);
        lastAngle = getAngle(pos1, pos2);

    } else if (e.touches.length === 1) {
        // SINGLE-TOUCH: Bắt đầu kéo (pan)
        lastPinchDist = null;
        lastAngle = null;
        isDragging = true;
        touchStartX = pos1.x;
        touchStartY = pos1.y;
    }
}

function handleTouchMove(e) {
    if (!currentOriginalImg) return;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const baseScaleX = canvas.width / IMAGE_CONFIG.baseWidth;
    const baseScaleY = canvas.height / IMAGE_CONFIG.baseHeight;

    if (e.touches.length === 2) {
        // --- XỬ LÝ PINCH VÀ ROTATE ---
        isDragging = false;
        const pos1 = getTouchPos(e.touches[0], rect, scaleX, scaleY);
        const pos2 = getTouchPos(e.touches[1], rect, scaleX, scaleY);

        const currentDist = getDistance(pos1, pos2);
        const currentAngle = getAngle(pos1, pos2);

        // 1. ZOOM (Pinch)
        if (lastPinchDist !== null) {
            const scaleChange = currentDist / lastPinchDist;
            const oldScale = currentImgScale;
            currentImgScale *= scaleChange;
            if (currentImgScale < 0.1) currentImgScale = 0.1;

            // --- Tính điểm Pivot (Tâm của hai ngón tay) ---
            const frameXBase = IMAGE_CONFIG.user.x;
            const frameYBase = IMAGE_CONFIG.user.y;
            const frameWBase = IMAGE_CONFIG.user.w;
            const frameHBase = IMAGE_CONFIG.user.h;

            const frameCenterX_Scaled = (frameXBase + frameWBase / 2) * baseScaleX;
            const frameCenterY_Scaled = (frameYBase + frameHBase / 2) * baseScaleY;

            // Tọa độ tâm pinch (đã scale)
            const pinchCenterX_Scaled = (pos1.x + pos2.x) / 2;
            const pinchCenterY_Scaled = (pos1.y + pos2.y) / 2;

            // Dịch chuyển về tâm khung, Xoay ngược, và chuyển về Base Coords
            const translatedX = pinchCenterX_Scaled - frameCenterX_Scaled;
            const translatedY = pinchCenterY_Scaled - frameCenterY_Scaled;

            const rotation = currentRotation;
            const cos = Math.cos(-rotation);
            const sin = Math.sin(-rotation);

            const rotatedX = translatedX * cos - translatedY * sin;
            const rotatedY = translatedX * sin + translatedY * cos;

            // Tọa độ chuột trong hệ tọa độ gốc của khung ảnh user (base coords)
            const mouseXBase = (rotatedX / baseScaleX) + (frameWBase / 2);
            const mouseYBase = (rotatedY / baseScaleY) + (frameHBase / 2);

            // Áp dụng công thức zoom dựa trên điểm pivot
            const ratio = currentImgScale / oldScale;
            currentImgX = mouseXBase - (mouseXBase - currentImgX) * ratio;
            currentImgY = mouseYBase - (mouseYBase - currentImgY) * ratio;
        }

        // 2. ROTATION
        if (lastAngle !== null) {
            const angleChange = currentAngle - lastAngle;
            currentImgInternalRotation += angleChange;
        }

        lastPinchDist = currentDist;
        lastAngle = currentAngle;

        taoAnh();

    } else if (e.touches.length === 1 && isDragging) {
        // --- XỬ LÝ PAN (một ngón tay) ---
        const pos = getTouchPos(e.touches[0], rect, scaleX, scaleY);
        const deltaX = pos.x - touchStartX;
        const deltaY = pos.y - touchStartY;

        // Logic kéo 1 ngón tay (tính cả xoay khung)
        const rotation = currentRotation;
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);

        const rotatedDeltaX = (deltaX * cos - deltaY * sin) / baseScaleX;
        const rotatedDeltaY = (deltaX * sin + deltaY * cos) / baseScaleX;

        currentImgX += rotatedDeltaX;
        currentImgY += rotatedDeltaY;

        touchStartX = pos.x;
        touchStartY = pos.y;
        taoAnh();
    }
}

function handleTouchEnd(e) {
    // Nếu chỉ còn 1 ngón tay, reset state đa chạm
    if (e.touches.length === 1) {
        lastPinchDist = null;
        lastAngle = null;
        // Bắt đầu chế độ kéo 1 ngón tay ngay lập tức
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;

        const pos = getTouchPos(e.touches[0], rect, scaleX, scaleX);
        isDragging = true;
        touchStartX = pos.x;
        touchStartY = pos.y;

    } else if (e.touches.length === 0) {
        // Nếu không còn ngón tay nào, reset tất cả
        isDragging = false;
        lastPinchDist = null;
        lastAngle = null;
    }
}


// === Hàm vẽ ảnh chính (ĐÃ THÊM LOGIC XOAY CHO ẢNH NỘI BỘ) ===
async function taoAnh() {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const baseWidth = IMAGE_CONFIG.baseWidth;
    const baseHeight = IMAGE_CONFIG.baseHeight;
    const scaleX = canvas.width / baseWidth;
    const scaleY = canvas.height / baseHeight;

    const bgPath = window.bgImagePath || IMAGE_CONFIG.bg.path;
    const frame = await loadImage(bgPath);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

    // --- Vẽ ảnh người dùng ---
    if (currentOriginalImg) {
        const frameX = IMAGE_CONFIG.user.x * scaleX;
        const frameY = IMAGE_CONFIG.user.y * scaleY;
        const frameW = IMAGE_CONFIG.user.w * scaleX;
        const frameH = IMAGE_CONFIG.user.h * scaleY;

        const centerX = frameX + frameW / 2;
        const centerY = frameY + frameH / 2;

        const clipX = -frameW / 2;
        const clipY = -frameH / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(currentRotation); // FRAME ROTATION (góc cố định)

        // 1. Clip
        ctx.beginPath();
        ctx.rect(clipX, clipY, frameW, frameH);
        ctx.clip();

        // 2. Draw Image (với Internal Rotation)
        const imgDisplayWidth = currentOriginalImg.width * currentImgScale * scaleX;
        const imgDisplayHeight = currentOriginalImg.height * currentImgScale * scaleY;

        const drawX = clipX + (currentImgX * scaleX);
        const drawY = clipY + (currentImgY * scaleY);

        // --- ÁP DỤNG XOAY NỘI BỘ (Pinch Rotation/Shift+Scroll Rotation) ---
        ctx.save(); // Save 2: để áp dụng xoay nội bộ

        // Pivot point cho xoay nội bộ
        const imgCenterDrawX = drawX + imgDisplayWidth / 2;
        const imgCenterDrawY = drawY + imgDisplayHeight / 2;

        ctx.translate(imgCenterDrawX, imgCenterDrawY);
        ctx.rotate(currentImgInternalRotation); // Áp dụng xoay từ người dùng
        ctx.translate(-imgCenterDrawX, -imgCenterDrawY);

        ctx.drawImage(currentOriginalImg, drawX, drawY, imgDisplayWidth, imgDisplayHeight);

        ctx.restore(); // Restore 2: loại bỏ xoay nội bộ

        // 3. Draw Border
        const gradient = ctx.createLinearGradient(clipX, clipY, clipX + frameW, clipY + frameH);
        gradient.addColorStop(0, IMAGE_CONFIG.user.border.colorLight);
        gradient.addColorStop(1, IMAGE_CONFIG.user.border.colorNormal);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = IMAGE_CONFIG.user.border.width * scaleX;

        ctx.beginPath();
        ctx.rect(clipX, clipY, frameW, frameH);
        ctx.stroke();

        ctx.restore(); // Khôi phục trạng thái 1, bỏ xoay và dịch chuyển của khung
    }

    // Lấy dữ liệu
    const ten = document.getElementById("TenNguoiGui")?.value.trim() || "";
    const chucvu = document.getElementById("ChucVu")?.value || "";
    const noidung = document.getElementById("NoiDung")?.value.trim() || "";

    // Lấy tọa độ trung tâm cho Tên và Chức vụ (X không đổi)
    const tenChucVuCenterX = FONT_CONFIG.ten.x * scaleX + (IMAGE_CONFIG.user.w * scaleX / 2);

    // --- Vẽ Tên (CÓ XOAY) ---
    const tenConfig = FONT_CONFIG.ten;
    const tenYScaled = tenConfig.y * scaleY;
    const tenRotationRad = tenConfig.rotation * (Math.PI / 180);

    let tenFontSize = tenConfig.size;

    // Đặt lại căn lề và màu
    ctx.textAlign = 'center';
    ctx.fillStyle = tenConfig.color;

    // Tính toán lại font size nếu quá dài
    ctx.font = `${tenConfig.weight} ${tenFontSize * scaleX}px ${tenConfig.family}`;
    let tenWidth = ctx.measureText(ten).width;
    const maxTenWidthScaled = tenConfig.maxWidthTen * scaleX;
    while (tenWidth > maxTenWidthScaled && tenFontSize > 20) {
        tenFontSize -= 1;
        ctx.font = `${tenConfig.weight} ${tenFontSize * scaleX}px ${tenConfig.family}`;
        tenWidth = ctx.measureText(ten).width;
    }

    // ÁP DỤNG XOAY cho TÊN
    ctx.save();
    ctx.translate(tenChucVuCenterX, tenYScaled); // Di chuyển pivot đến điểm đặt text
    ctx.rotate(tenRotationRad);

    // Vẽ Tên tại (0, 0) trong hệ tọa độ đã translate/rotate
    ctx.fillText(ten, 0, 0);

    ctx.restore(); // Khôi phục trạng thái

    // --- Vẽ Chức vụ (CÓ XOAY) ---
    const chucvuConfig = FONT_CONFIG.chucvu;
    const chucvuYScaled = chucvuConfig.y * scaleY;
    const chucvuRotationRad = chucvuConfig.rotation * (Math.PI / 180);

    // Đặt lại căn lề và màu
    ctx.textAlign = 'center';
    ctx.font = `${chucvuConfig.weight} ${chucvuConfig.size * scaleX}px ${chucvuConfig.family}`;
    ctx.fillStyle = chucvuConfig.color;

    const chucvuMaxLineWidth = chucvuConfig.maxWidth * scaleX;
    const chucvuLines = wrapTextSimple(
        ctx,
        chucvu,
        chucvuMaxLineWidth,
        chucvuConfig.maxLinesChucVu
    );
    const chucvuLineHeight = chucvuConfig.lineHeight * scaleY;

    // ÁP DỤNG XOAY cho CHỨC VỤ
    ctx.save();
    ctx.translate(tenChucVuCenterX, chucvuYScaled); // Pivot tại baseline của dòng đầu tiên
    ctx.rotate(chucvuRotationRad);

    chucvuLines.forEach((line, i) => {
        ctx.fillText(
            line,
            0, // Vẽ tại X=0 (vì đã translate đến CenterX)
            i * chucvuLineHeight // Dịch chuyển Y xuống dòng
        );
    });

    ctx.restore(); // Khôi phục trạng thái

    // --- Vẽ Nội dung ---
    const noidungConfig = FONT_CONFIG.noidung;

    // !!! QUAN TRỌNG: Đặt lại căn lề trước khi vẽ Nội dung
    ctx.textAlign = 'left';

    ctx.font = `${noidungConfig.weight} ${noidungConfig.size * scaleX}px ${noidungConfig.family}`;
    ctx.fillStyle = noidungConfig.color;
    const maxLineWidth = noidungConfig.maxWidth * scaleX;
    const textX = noidungConfig.x * scaleX;
    const textY = noidungConfig.y * scaleY;
    const lineHeight = noidungConfig.lineHeight * scaleY;
    const lines = wrapText(
        ctx,
        noidung,
        maxLineWidth
    );
    lines.forEach((line, i) => {
        // Nội dung không xoay, vẽ bình thường
        const isLastLine = i === lines.length - 1;
        const hasMultipleWords = line.trim().indexOf(' ') !== -1;

        // Chỉ căn đều (justify) nếu không phải dòng cuối và có nhiều hơn một từ
        if (!isLastLine && hasMultipleWords && line.trim() !== "") {
            drawJustifiedText(ctx, line, textX, textY + i * lineHeight, maxLineWidth);
        } else {
            // Dòng cuối hoặc dòng ngắn phải căn lề trái
            ctx.fillText(line, textX, textY + i * lineHeight);
        }
    });

    return canvas;
}

// === Hàm vẽ văn bản căn đều (Justify Text) - Dùng cho Nội dung ===
function drawJustifiedText(ctx, line, x, y, maxWidth) {
    const words = line.split(/\s+/).filter(w => w.length > 0);
    const textWidth = ctx.measureText(line).width;
    const numSpaces = words.length - 1;

    if (numSpaces <= 0) {
        ctx.textAlign = 'left';
        ctx.fillText(line, x, y);
        return;
    }

    const spaceToFill = maxWidth - textWidth;
    const extraSpacePerGap = spaceToFill / numSpaces;
    let currentX = x;

    for (let i = 0; i < words.length; i++) {
        ctx.fillText(words[i], currentX, y);

        if (i < numSpaces) {
            const wordWidth = ctx.measureText(words[i]).width;
            const standardSpace = ctx.measureText(' ').width;
            currentX += wordWidth + standardSpace + extraSpacePerGap;
        }
    }
}

// === Helper wrap text (Nội dung - giới hạn dòng, căn đều) ===
function wrapText(ctx, text, maxWidth) {
    const lines = [];
    const maxLines = FONT_CONFIG.noidung.maxLines;
    const paragraphs = text.split('\n');

    paragraphs.forEach(paragraph => {
        if (lines.length >= maxLines) return;

        if (paragraph === "") {
            lines.push("");
            return;
        }

        const words = paragraph.split(/\s+/).filter(w => w.length > 0);
        let currentLine = "";

        for (const word of words) {
            if (lines.length >= maxLines) break;

            const testLine = currentLine.length > 0 ? currentLine + " " + word : word;
            const testWidth = ctx.measureText(testLine).width;

            if (testWidth > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine && lines.length < maxLines) {
            lines.push(currentLine);
        }
    });

    if (lines.length > 0 && lines[lines.length - 1] === "") {
        lines.pop();
    }

    return lines.slice(0, maxLines);
}

// === Helper wrap text đơn giản (Chức vụ - hỗ trợ Enter, giới hạn 2 dòng) ===
function wrapTextSimple(ctx, text, maxWidth, maxLines) {
    const lines = [];
    const paragraphs = text.split('\n');

    paragraphs.forEach(paragraph => {
        if (lines.length >= maxLines) return;

        if (paragraph === "") {
            lines.push("");
            return;
        }

        const words = paragraph.split(/\s+/).filter(w => w.length > 0);
        let currentLine = "";

        for (const word of words) {
            if (lines.length >= maxLines) break;

            const testLine = currentLine.length > 0 ? currentLine + " " + word : word;
            const testWidth = ctx.measureText(testLine).width;

            if (testWidth > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine && lines.length < maxLines) {
            lines.push(currentLine);
        }
    });

    return lines.slice(0, maxLines);
}

// === Helper load ảnh ===
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.error(`Không tải được ảnh: ${src}`);
            // Sử dụng ảnh placeholder nếu ảnh chính không tải được
            const placeholderImg = new Image();
            // Đây chỉ là một URL placeholder mẫu, bạn nên thay thế bằng placeholder thực tế
            placeholderImg.src = "https://placehold.co/650x780/dddddd/333333?text=Image+Error";
            placeholderImg.onload = () => resolve(placeholderImg);
            placeholderImg.onerror = () => resolve(null); // Trả về null nếu cả placeholder cũng lỗi
        };
        img.src = src;
    });
}
