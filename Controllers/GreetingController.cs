using System.Web.Mvc;

namespace YourProject.Controllers
{
    public class GreetingController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public JsonResult SaveGreeting(string name, string position, string message, string imageBase64)
        {
            try
            {
                var bytes = System.Convert.FromBase64String(imageBase64.Split(',')[1]);
                var fileName = Server.MapPath("~/Content/generated/greeting_" + System.Guid.NewGuid() + ".png");
                System.IO.File.WriteAllBytes(fileName, bytes);
                return Json(new { success = true, path = Url.Content(fileName.Replace(Server.MapPath("~"), "~")) });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }
    }
}
