/**
 * Utility functions for repairing mojibake (double-encoded Vietnamese text)
 * that can occur when text is incorrectly decoded from Windows-1252 as Latin-1.
 */

const brokenTextMap = {
  "Chưa có dữ liệu hoặc chưa khởi tạo DB.": "Chưa có dữ liệu hoặc chưa khởi tạo DB.",
  "Chưa có dữ liệu.": "Chưa có dữ liệu.",
  "Chưa có hồ sơ trong hàng chờ.": "Chưa có hồ sơ trong hàng chờ.",
  "Tìm kiếm...": "Tìm kiếm...",
  "Tên/Nội dung": "Tên/Nội dung",
  "Xóa": "Xóa",
  "Xem chi tiết": "Xem chi tiết",
  "Quản lý tài liệu": "Quản lý tài liệu",
  "Danh sách chờ xử lý": "Danh sách chờ xử lý",
  "Chi tiết phê duyệt": "Chi tiết phê duyệt",
  "Luồng xử lý": "Luồng xử lý",
  "Tích hợp OCR AI": "Tích hợp OCR AI",
  "Tích hợp hệ thống khác": "Tích hợp hệ thống khác",
  "Hồ sơ": "Hồ sơ",
  "Hồ sơ xuất bản HS-002": "Hồ sơ xuất bản HS-002",
  "Mã hồ sơ": "Mã hồ sơ",
  "Tên hồ sơ": "Tên hồ sơ",
  "Loại hồ sơ": "Loại hồ sơ",
  "Chức năng": "Chức năng",
  "Vui lòng": "Vui lòng",
  "Không": "Không",
  "thành công": "thành công",
  "Trạng thái": "Trạng thái",
  "hiện tại": "hiện tại",
  "Duyệt": "Duyệt",
  "Chuyển cấp": "Chuyển cấp",
  "Từ chối": "Từ chối",
  "Nhập mã PIN...": "Nhập mã PIN...",
  "Nhập mã OTP...": "Nhập mã OTP...",
  "Chưa gửi OTP": "Chưa gửi OTP",
};

/**
 * Attempts to repair a single string that may be mojibake-encoded.
 * Tries multiple encodings and picks the result with the fewest garbled characters.
 */
export function repairDisplayedText(value) {
  if (typeof value !== "string" || !value) return value;

  const score = (text) => (text.match(/[ÃÂ]|(?:áº|á»|Ä|Æ|â€)|/g) || []).length;
  const tryDecode = (text, encoding) => {
    try {
      const bytes = Uint8Array.from([...text].map((character) => character.charCodeAt(0) & 0xff));
      return new TextDecoder(encoding).decode(bytes);
    } catch {
      return text;
    }
  };
  const repairToken = (token) => {
    if (!token || !/[ÃÂáºá»ÄÆâ€]/.test(token)) return token;
    if (brokenTextMap[token]) return brokenTextMap[token];

    const candidates = new Set([token, token.replaceAll("", "")]);
    [token, token.replaceAll("", "")].forEach((current) => {
      if (!current) return;
      candidates.add(tryDecode(current, "utf-8"));
      candidates.add(tryDecode(current, "latin1"));
      candidates.add(tryDecode(current, "cp1252"));
    });

    let best = token;
    candidates.forEach((candidate) => {
      if (score(candidate) < score(best)) best = candidate;
    });
    return best;
  };

  let repaired = brokenTextMap[value] || value;
  repaired = repaired.replaceAll("Tích hợp OCR AI", "Tích hợp OCR AI");
  repaired = repaired
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (brokenTextMap[part]) return brokenTextMap[part];
      return repairToken(part);
    })
    .join("");

  if (score(repaired) < score(value)) return repaired;
  return repaired;
}

/**
 * Walks all DOM text nodes under `root` and repairs any mojibake text in-place.
 * Also repairs value/title/placeholder attributes on form elements.
 */
export function repairRenderedText(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);
  textNodes.forEach((textNode) => {
    const repaired = repairDisplayedText(textNode.nodeValue);
    if (repaired !== textNode.nodeValue) textNode.nodeValue = repaired;
  });
  root.querySelectorAll("input, textarea, [title], [placeholder], option").forEach((element) => {
    ["value", "title", "placeholder"].forEach((attribute) => {
      if (element.hasAttribute(attribute)) {
        const repaired = repairDisplayedText(element.getAttribute(attribute));
        if (repaired !== element.getAttribute(attribute)) element.setAttribute(attribute, repaired);
      }
    });
  });
}

/**
 * Normalizes menu group titles and item labels using repairDisplayedText.
 */
export function normalizeMenuGroups(groups) {
  return groups.map((group) => ({
    ...group,
    title: repairDisplayedText(group.title),
    items: group.items.map((item) => repairDisplayedText(item)),
  }));
}

/**
 * Merges API-provided menu groups into the design-defined menu structure.
 * API data takes priority when available; the design structure ensures
 * the sidebar is never empty even when the backend is offline.
 */
export function mergeMenuWithDesign(groups, designMenuGroups) {
  const aliases = {
    "Quản trị đơn vị": "Quản trị nơi sử dụng",
    "Nhập liệu & Số hóa hồ sơ": "Nhập liệu",
    "Phê duyệt & Xuất bản hồ sơ": "Kiểm duyệt",
    "Tra cứu & Đăng ký mượn hồ sơ": "Khai thác",
    "Danh mục kho lưu trữ": "Danh mục",
    "Báo cáo & Thống kê": "Báo cáo",
    "Duyệt đăng ký mượn hồ sơ": "Duyệt phiếu",
    "Công cụ AI & OCR": "Nhập liệu",
  };
  const merged = designMenuGroups.map((group) => ({ ...group, items: [...group.items] }));
  groups.forEach((group) => {
    const targetTitle = aliases[group.title] || group.title;
    const target = merged.find((item) => item.title === targetTitle);
    if (!target) return;
    target.items = [...new Set([...target.items, ...group.items])];
  });
  return merged;
}
