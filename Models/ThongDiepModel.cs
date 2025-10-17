using System;
using System.ComponentModel.DataAnnotations;
using System.Web; // Cần thiết cho HttpPostedFileBase
using System.Web.Mvc;

namespace DaiHoi7.Models
{
    public class ThongDiepModel
    {
        [Required(ErrorMessage = "Vui lòng nhập họ và tên.")]
        [Display(Name = "Họ và tên")]
        public string TenNguoiGui { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập chức vụ.")]
        [Display(Name = "Chức vụ")]
        public string ChucVu { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập nội dung thông điệp.")]
        [AllowHtml] // Cho phép nội dung có thể có ký tự đặc biệt
        [Display(Name = "Nội dung thông điệp")]
        public string NoiDung { get; set; }

        [Display(Name = "Ảnh đại diện")]
        // Loại bỏ [Required] ở đây vì ảnh có thể được tải hoặc không
        public HttpPostedFileBase HinhAnh { get; set; }

        // Trường này để nhận dữ liệu Base64 từ Canvas/JavaScript khi submit
        public string GeneratedImageData { get; set; }
    }
}