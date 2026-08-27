using IDP.DMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace IDP.DMS.Api.Controllers
{
    [ApiController]
    [Route("api/ocr")]
    [Tags("OCR Engine")]
    public class OcrController : ControllerBase
    {
        private readonly OcrService _ocrService;
        private readonly IWebHostEnvironment _env;

        public OcrController(OcrService ocrService, IWebHostEnvironment env)
        {
            _ocrService = ocrService;
            _env = env;
        }

        /// <summary>
        /// Bóc tách văn bản từ file ảnh/PDF bằng Gemini Vision AI.
        /// Engine hiện tại cố định là Gemini; tham số <paramref name="engine"/> được giữ
        /// cho tương thích ngược với các client cũ.
        /// </summary>
        [HttpPost("extract")]
        public async Task<IActionResult> ExtractOcrText(IFormFile file, [FromQuery] string? engine)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

            const string engineName = "gemini";
            var tempFolder = Path.Combine(_env.ContentRootPath, "temp_ocr");
            Directory.CreateDirectory(tempFolder);

            var ext = Path.GetExtension(file.FileName);
            var filePath = Path.Combine(tempFolder, $"{Guid.NewGuid():N}{ext}");

            try
            {
                await using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var extraction = _ocrService.ExtractTextDetailed(filePath, engineName, forceGemini: true);

                return Ok(new
                {
                    text = extraction.Text,
                    engine = extraction.Engine,
                    usedFallback = extraction.UsedFallback,
                    message = extraction.Note
                });
            }
            catch (Exception ex)
            {
                return Problem($"Lỗi OCR ({engineName}): {ex.Message}");
            }
            finally
            {
                if (System.IO.File.Exists(filePath))
                    System.IO.File.Delete(filePath);
            }
        }
    }
}
