using System.Text.Json;
using System.Text.RegularExpressions;
using IDP.DMS.Api.Models;

namespace IDP.DMS.Api.Services;

public sealed class UiDesignService
{
    private readonly UiDesignData _data;

    public UiDesignService(IWebHostEnvironment environment)
    {
        var path = Path.Combine(environment.ContentRootPath, "Data", "ui-design.json");
        var json = File.ReadAllText(path);
        _data = JsonSerializer.Deserialize<UiDesignData>(json) ?? new UiDesignData();
    }

    public IReadOnlyList<FunctionMenuGroup> GetMenu() =>
    [
        new("Quản trị hệ thống", [
            "Quản lý Menu",
            "Quản lý Nhóm quyền & Nhóm quyền báo cáo",
            "Quản lý Đơn vị / Cây đơn vị",
            "Danh mục dùng chung & Định nghĩa"
        ]),
        new("Quản trị đơn vị", [
            "Quản lý Nhóm quyền đơn vị",
            "Cây đơn vị cấp tỉnh & Người dùng tỉnh",
            "Cấu hình người dùng & Nhóm người duyệt",
            "Định nghĩa danh mục riêng & Phòng ban"
        ]),
        new("Danh mục kho lưu trữ", [
            "Danh mục loại hồ sơ & Cấu hình loại",
            "Quản lý Kho - Kệ - Tầng - Hộp",
            "Mẫu loại văn bản, Phông lưu trữ & Mục lục"
        ]),
        new("Nhập liệu & Số hóa hồ sơ", [
            "Thêm mới & Quản lý danh sách hồ sơ",
            "Quản lý văn bản thành phần",
            "Chuyển kho hồ sơ",
            "Tải lên từ ứng dụng Quét / Scanning",
            "Nhận dạng OCR nhiều vùng (Zonal OCR)",
            "Import hồ sơ hàng loạt",
            "Thanh lý hồ sơ"
        ]),
        new("Phê duyệt & Xuất bản hồ sơ", [
            "Hàng chờ duyệt & Quản lý quy trình Workflow",
            "Phê duyệt xuất bản / Hủy xuất bản",
            "Quản lý hồ sơ không hợp lệ / Yêu cầu bổ sung"
        ]),
        new("Tra cứu & Đăng ký mượn hồ sơ", [
            "Tìm kiếm & Tra cứu hồ sơ nâng cao",
            "Đăng ký mượn hồ sơ (Bản cứng / Bản mềm)",
            "Lịch sử mượn trả & Xem trực tuyến"
        ]),
        new("Duyệt đăng ký mượn hồ sơ", [
            "Hàng chờ duyệt mượn hồ sơ",
            "Phê duyệt / Từ chối phiếu mượn"
        ]),
        new("Báo cáo & Thống kê", [
            "Báo cáo tổng hợp số hóa & Tỷ lệ OCR",
            "Báo cáo mượn trả hồ sơ",
            "Xuất báo cáo PDF / Excel"
        ]),
        new("Công cụ AI & OCR", [
            "Trích xuất OCR PDF / Ảnh giữ cấu trúc biểu mẫu",
            "Bóc tách trường dữ liệu AI"
        ]),
        new("Tài khoản cá nhân & Dashboard", [
            "Dashboard theo dõi dành cho Lãnh đạo",
            "Thông tin tài khoản & Đổi mật khẩu"
        ])
    ];

    public object GetSummary()
    {
        var features = _data.Features;
        return new
        {
            featureCount = features.Count,
            sectionCount = features.Select(f => f.Section).Distinct().Count(),
            actionCount = features.Sum(f => f.Actions.Count),
            actorCount = features.Select(f => f.Actor).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().Count()
        };
    }

    public IEnumerable<FeatureDto> SearchFeatures(string? phase, string? actor, string? kind, string? query)
    {
        var features = _data.Features.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(phase))
        {
            features = features.Where(f => f.Phase.Equals(phase, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(actor))
        {
            features = features.Where(f => f.Actor.Equals(actor, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(kind))
        {
            features = features.Where(f => f.Actions.Any(a => a.Kind.Contains(kind, StringComparer.OrdinalIgnoreCase)));
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalized = query.Trim();
            features = features.Where(f => TextOf(f).Contains(normalized, StringComparison.OrdinalIgnoreCase));
        }

        return features;
    }

    public FeatureDto? GetFeature(string id) =>
        _data.Features.FirstOrDefault(f => f.Id.Equals(id, StringComparison.OrdinalIgnoreCase));

    public ScreenSpec? GetScreen(string id)
    {
        var feature = GetFeature(id);
        if (feature is null)
        {
            return null;
        }

        return new ScreenSpec(feature.Id, LayoutKind(feature), InferFields(feature), InferRules(feature));
    }

    private static string TextOf(FeatureDto feature)
    {
        var parts = new List<string> { feature.Name, feature.Section, feature.Actor, feature.Description };
        parts.AddRange(feature.Actions.SelectMany(a => new[] { a.Name, a.Description }));
        return string.Join(' ', parts);
    }

    private static string LayoutKind(FeatureDto feature)
    {
        var t = TextOf(feature).ToLowerInvariant();
        if (t.Contains("import")) return "import";
        if (ContainsAny(t, "nhập mới hồ sơ", "cập nhật hồ sơ", "thêm văn bản", "ocr", "nhập liệu hồ sơ")) return "entry";
        if (ContainsAny(t, "tìm kiếm hồ sơ", "tra cứu", "xem hồ sơ trực tuyến", "khai thác")) return "search";
        if (ContainsAny(t, "duyệt", "xác nhận", "xuất bản", "không hợp lệ", "phiếu mượn", "chuyển giao", "thu hồi")) return "approve";
        if (ContainsAny(t, "kho", "kệ", "tầng", "hộp", "phông lưu trữ")) return "storage";
        if (t.Contains("báo cáo")) return "report";
        return "admin";
    }

    private static IReadOnlyList<FieldSpec> InferFields(FeatureDto feature)
    {
        var t = TextOf(feature).ToLowerInvariant();
        var fields = new List<FieldSpec>();
        void Add(string name, string type = "text", bool required = true, string? hint = null) => fields.Add(new FieldSpec(name, type, required, hint));

        if (t.Contains("đăng nhập"))
        {
            Add("Tên đăng nhập");
            Add("Mật khẩu", "password");
        }
        else if (t.Contains("mật khẩu"))
        {
            Add("Mật khẩu hiện tại", "password");
            Add("Mật khẩu mới", "password");
            Add("Xác nhận mật khẩu", "password");
        }
        else if (ContainsAny(t, "người dùng", "user"))
        {
            Add("Họ tên");
            Add("Tên đăng nhập");
            Add("Email", "email", false);
            Add("Số điện thoại", "tel", false);
            Add("Nhóm quyền", "select");
            Add("Đơn vị", "select");
            Add("Trạng thái", "select");
        }
        else if (ContainsAny(t, "hồ sơ", "tài liệu"))
        {
            Add("Mã hồ sơ");
            Add("Tên hồ sơ");
            Add("Kho hồ sơ", "select");
            Add("Loại hồ sơ", "select");
            Add("Từ ngày", "date", false);
            Add("Đến ngày", "date", false);
            Add("Thuộc tính mở rộng", "text", false, "Theo cấu hình loại hồ sơ");
        }
        else if (t.Contains("báo cáo"))
        {
            Add("Mã báo cáo");
            Add("Tên báo cáo");
            Add("Tệp thiết kế", "file");
            Add("Loại dữ liệu", "select");
            Add("Tham số", "textarea", false);
        }
        else if (t.Contains("danh mục"))
        {
            Add("Mã danh mục");
            Add("Tên danh mục");
            Add("Loại danh mục", "select", false);
            Add("Trạng thái", "select");
        }
        else
        {
            Add("Mã");
            Add("Tên");
            Add("Mô tả", "textarea", false);
            Add("Trạng thái", "select");
        }

        if (ContainsAny(t, "file", "upload", "pdf", "scan"))
        {
            Add("Tệp đính kèm", "file", false, "PDF/DOC/DOCX/XLSX/JPG/PNG theo nghiệp vụ");
        }

        return fields;
    }

    private static IReadOnlyList<string> InferRules(FeatureDto feature)
    {
        var t = TextOf(feature).ToLowerInvariant();
        var rules = new List<string>
        {
            "Các trường có dấu * bắt buộc nhập trước khi lưu.",
            "Mã định danh không trùng trong cùng đơn vị/phân hệ.",
            "Người dùng chỉ thấy dữ liệu thuộc phạm vi quyền được cấp."
        };

        if (t.Contains("tìm kiếm")) rules.Add("Cho phép tìm gần đúng, bỏ dấu, phân trang và giữ lại điều kiện tìm kiếm gần nhất.");
        if (ContainsAny(t, "xóa", "xoá")) rules.Add("Không cho xóa bản ghi đã phát sinh dữ liệu; chuyển sang ngừng hoạt động nếu còn ràng buộc.");
        if (ContainsAny(t, "người dùng", "đăng nhập")) rules.Add("Tên đăng nhập không sửa sau khi tạo; mật khẩu tối thiểu 8 ký tự, có chữ và số.");
        if (ContainsAny(t, "từ ngày", "đến ngày")) rules.Add("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
        if (ContainsAny(t, "hồ sơ", "tài liệu")) rules.Add("Hồ sơ phải thuộc kho, loại hồ sơ và trạng thái hợp lệ trước khi xuất bản hoặc cho mượn.");
        if (t.Contains("mượn")) rules.Add("Không cho đăng ký mượn hồ sơ đang chờ duyệt, hết hạn quyền khai thác hoặc đã được mượn chưa trả.");
        if (t.Contains("duyệt")) rules.Add("Bắt buộc ghi lý do khi từ chối, chuyển cấp, báo không hợp lệ hoặc hủy duyệt.");
        if (ContainsAny(t, "upload", "tệp", "pdf")) rules.Add("Kiểm tra định dạng, dung lượng, virus và trạng thái OCR trước khi lưu chính thức.");
        if (t.Contains("báo cáo")) rules.Add("Mã báo cáo không trùng; tệp mẫu báo cáo phải khớp loại tham số đã khai báo.");
        if (ContainsAny(t, "kho", "kệ", "tầng", "hộp")) rules.Add("Ràng buộc phân cấp Kho > Kệ > Tầng > Hộp; không cho chọn con khi cha chưa được chọn.");
        return rules;
    }

    private static bool ContainsAny(string text, params string[] values) =>
        values.Any(text.Contains);
}
