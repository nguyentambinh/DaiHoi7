using System;
using System.IO;
using System.Web;
using System.Web.Mvc;
using DaiHoi7.Models;
using System.Linq;

namespace DaiHoi7.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult _Header()
        {
            return PartialView();
        }

        public ActionResult _Nav()
        {
            return PartialView();
        }

        // GET: /Home/ThongDiep
        [HttpGet]
        public ActionResult ThongDiep()
        {
            // Reset ModelState khi GET để tránh hiển thị lỗi cũ
            return View(new ThongDiepModel());
        }

        // --- ACTION XỬ LÝ GỬI FORM VỚI CHUỖI BASE64 CỦA ẢNH TỪ CANVAS ---
        [HttpPost]
        [ValidateInput(false)]
        [ValidateAntiForgeryToken]
        public ActionResult ThongDiep(ThongDiepModel model, string GeneratedImageBase64)
        {
            // Kiểm tra các lỗi validation từ Model (Required fields, v.v.)
            if (ModelState.IsValid)
            {
                // 1. Xử lý ảnh được tạo từ Canvas (nhận dưới dạng Base64 string)
                if (!string.IsNullOrEmpty(GeneratedImageBase64))
                {
                    try
                    {
                        // Loại bỏ phần header "data:image/jpeg;base64," hoặc "data:image/png;base64,"
                        string base64Data = GeneratedImageBase64.Split(',').LastOrDefault();

                        if (string.IsNullOrEmpty(base64Data))
                        {
                            // Thêm lỗi vào ModelState nhưng KHÔNG dùng ViewData/TempData
                            ModelState.AddModelError("", "Chuỗi Base64 không hợp lệ sau khi tách header.");
                            return View(model);
                        }

                        // Chuyển Base64 string thành byte array
                        byte[] imageBytes = Convert.FromBase64String(base64Data);

                        string folderName = "generated";
                        string folderPath = Server.MapPath($"~/Content/{folderName}");

                        if (!Directory.Exists(folderPath))
                        {
                            Directory.CreateDirectory(folderPath);
                        }

                        // Tạo tên file duy nhất dựa trên tên người gửi và timestamp
                        string safeName = string.IsNullOrEmpty(model.TenNguoiGui) ? "unknown" : model.TenNguoiGui.Replace(" ", "_").Substring(0, Math.Min(model.TenNguoiGui.Length, 30));
                        string uniqueFileName = $"td_{safeName}_{DateTime.Now.Ticks}.png";
                        string filePath = Path.Combine(folderPath, uniqueFileName);

                        // LƯU FILE ẢNH TỪ BYTE ARRAY
                        System.IO.File.WriteAllBytes(filePath, imageBytes);

                        // 2. Thực hiện lưu model và đường dẫn ảnh vào Database ở đây.

                        // TRƯỜNG HỢP THÀNH CÔNG: Chuyển hướng mà KHÔNG có TempData thông báo
                        return RedirectToAction("ThongDiep");
                    }
                    catch (Exception ex)
                    {
                        // TRƯỜNG HỢP LỖI XỬ LÝ ẢNH (Base64 conversion, IOException, v.v.)
                        // Thêm lỗi vào ModelState nhưng KHÔNG dùng ViewData/TempData
                        ModelState.AddModelError("", "Lỗi xử lý ảnh: " + ex.Message);
                    }
                }
                else
                {
                    // Lỗi nếu không có chuỗi Base64 được đính kèm
                    // Thêm lỗi vào ModelState nhưng KHÔNG dùng ViewData/TempData
                    ModelState.AddModelError("", "Không tìm thấy dữ liệu ảnh Base64 để xử lý. Vui lòng tải ảnh lên Canvas trước khi gửi.");
                }
            }

            // TRƯỜNG HỢP MODELSTATE KHÔNG HỢP LỆ HOẶC LỖI XỬ LÝ ẢNH:
            // Trả về View hiện tại. Chỉ hiển thị lỗi Validation Message For (nếu có).
            return View(model);
        }
    }
}