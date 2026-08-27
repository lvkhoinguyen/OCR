import argparse
import contextlib
import html
import io
import json
import math
import os
import sys
import tempfile
import warnings
import zipfile
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree

warnings.filterwarnings("ignore")
os.environ["KMP_DUPLICATE_LIB_OK"] = "True"


def run_easyocr(image_path):
    """EasyOCR engine for Vietnamese and English printed text."""
    import easyocr

    reader = easyocr.Reader(["vi", "en"], gpu=False, verbose=False)
    return "\n".join(reader.readtext(image_path, detail=0))


def run_crnn(image_path):
    """CRNN + BiLSTM + CTC engine for Vietnamese handwritten text."""
    import cv2

    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)

    from ocr_modules.crop_text_line import segmentation_text_line
    from ocr_modules.process_image import process_multi, process_image, convert_img_to_input
    from ocr_modules.vietnamese_ocr import prediction_ocr, prediction_ocr_multi

    original_image = cv2.imread(image_path)
    if original_image is None:
        raise RuntimeError(f"Không đọc được ảnh: {image_path}")

    _, segments = segmentation_text_line(original_image)
    if len(segments) > 1:
        valid_images, _, size = process_multi(segments)
        return prediction_ocr_multi(valid_images, size)

    processed = process_image(original_image)
    return prediction_ocr(convert_img_to_input(processed))


def run_vietocr(image_path):
    """VietOCR TransformerOCR engine for Vietnamese text."""
    import cv2
    from PIL import Image

    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)

    from ocr_modules.crop_text_line import segmentation_text_line
    from ocr_modules.vietocr_module import vietOCR_prediction

    original_image = cv2.imread(image_path)
    if original_image is None:
        raise RuntimeError(f"Không đọc được ảnh: {image_path}")

    _, segments = segmentation_text_line(original_image)
    predictions = []
    for segment in segments:
        image = Image.fromarray(cv2.cvtColor(segment, cv2.COLOR_BGR2RGB))
        prediction = vietOCR_prediction(image)
        if prediction and prediction.strip():
            predictions.append(prediction.strip())

    if not predictions:
        image = Image.fromarray(cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB))
        prediction = vietOCR_prediction(image)
        if prediction and prediction.strip():
            predictions.append(prediction.strip())

    return "\n".join(predictions)


def run_tesseract(image_path):
    """Tesseract OCR for Vietnamese and English printed documents."""
    import pytesseract
    from PIL import Image

    image = Image.open(image_path)
    try:
        return pytesseract.image_to_string(image, lang="vie+eng")
    except pytesseract.TesseractError:
        return pytesseract.image_to_string(image, lang="eng")


def extract_docx_text(document_path):
    """Read text from a DOCX package without requiring python-docx."""
    with zipfile.ZipFile(document_path) as archive:
        with archive.open("word/document.xml") as document_xml:
            root = ElementTree.parse(document_xml).getroot()

    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    paragraphs = []
    for paragraph in root.iter(namespace + "p"):
        value = "".join(node.text or "" for node in paragraph.iter(namespace + "t"))
        if value.strip():
            paragraphs.append(value)
    return "\n".join(paragraphs)


def run_image_engine(image_path, engine):
    if engine == "crnn":
        return run_crnn(image_path)
    if engine == "vietocr":
        return run_vietocr(image_path)
    if engine == "tesseract":
        return run_tesseract(image_path)
    return run_easyocr(image_path)


def run_zone_engine(image_path, requested_engine):
    """Run the requested local engine, then deterministic local fallbacks if it is unavailable."""
    candidates = []
    for candidate in [requested_engine, "vietocr", "easyocr", "tesseract"]:
        if candidate not in candidates:
            candidates.append(candidate)
    failures = []
    for candidate in candidates:
        try:
            text = run_image_engine(image_path, candidate).strip()
            if text:
                return text, candidate
            failures.append(f"{candidate}: không nhận diện được chữ")
        except Exception as error:
            failures.append(f"{candidate}: {error}")
    raise RuntimeError("Tất cả OCR engine vùng đều thất bại. " + " | ".join(failures))


def render_input_pages(input_path, temporary_directory):
    """Yield raster page paths for images, multi-page TIFFs and scanned PDFs."""
    extension = Path(input_path).suffix.lower()
    if extension == ".pdf":
        try:
            import pymupdf as fitz
        except ImportError:
            import fitz

        document = fitz.open(input_path)
        try:
            if document.page_count == 0:
                raise RuntimeError("PDF không có trang để OCR.")
            for page_number, page in enumerate(document):
                output_path = os.path.join(temporary_directory, f"page_{page_number + 1:04d}.png")
                page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False).save(output_path)
                yield page_number + 1, output_path
        finally:
            document.close()
        return

    if extension in {".tif", ".tiff"}:
        from PIL import Image, ImageSequence

        with Image.open(input_path) as source:
            for page_number, frame in enumerate(ImageSequence.Iterator(source), start=1):
                output_path = os.path.join(temporary_directory, f"page_{page_number:04d}.png")
                frame.convert("RGB").save(output_path, "PNG")
                yield page_number, output_path
        return

    yield 1, input_path


def render_page(input_path, page_number, output_path, scale=2.5):
    """Render one 1-based page to a normalized RGB PNG and return its metadata."""
    from PIL import Image, ImageOps

    extension = Path(input_path).suffix.lower()
    if extension == ".pdf":
        try:
            import pymupdf as fitz
        except ImportError:
            import fitz

        document = fitz.open(input_path)
        try:
            page_count = document.page_count
            if page_number < 1 or page_number > page_count:
                raise ValueError(f"Trang {page_number} không tồn tại; tài liệu có {page_count} trang.")
            page = document.load_page(page_number - 1)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            pixmap.save(output_path)
            return {
                "page": page_number,
                "pageCount": page_count,
                "width": pixmap.width,
                "height": pixmap.height,
            }
        finally:
            document.close()

    if extension not in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}:
        raise ValueError("Xem trước OCR theo vùng chỉ hỗ trợ PDF, TIFF và các định dạng ảnh phổ biến.")

    with Image.open(input_path) as source:
        page_count = getattr(source, "n_frames", 1)
        if page_number < 1 or page_number > page_count:
            raise ValueError(f"Trang {page_number} không tồn tại; tài liệu có {page_count} trang.")
        if page_count > 1:
            source.seek(page_number - 1)
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.save(output_path, "PNG")
        return {
            "page": page_number,
            "pageCount": page_count,
            "width": image.width,
            "height": image.height,
        }


def extract_zones(input_path, zones_file, crops_directory, engine):
    """Crop normalized percentage boxes and OCR every crop with the selected local engine."""
    from PIL import Image

    payload = json.loads(Path(zones_file).read_text(encoding="utf-8"))
    zones = payload.get("zones") or []
    if not 1 <= len(zones) <= 12:
        raise ValueError("Mỗi lần OCR phải có từ 1 đến 12 vùng.")

    Path(crops_directory).mkdir(parents=True, exist_ok=True)
    page_images = {}
    page_metadata = {}
    results = []
    try:
        for page_number in sorted({int(zone.get("page", 1)) for zone in zones}):
            page_path = os.path.join(crops_directory, f"__page_{page_number:04d}.png")
            page_metadata[page_number] = render_page(input_path, page_number, page_path)
            with Image.open(page_path) as rendered_page:
                page_images[page_number] = rendered_page.convert("RGB")

        for index, zone in enumerate(zones, start=1):
            page_number = int(zone.get("page", 1))
            image = page_images[page_number]
            x = float(zone.get("x", 0))
            y = float(zone.get("y", 0))
            width = float(zone.get("width", 0))
            height = float(zone.get("height", 0))
            if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > 100 or y + height > 100:
                raise ValueError(f"Vùng '{zone.get('label', index)}' nằm ngoài phạm vi trang.")

            left = max(0, math.floor(image.width * x / 100.0))
            top = max(0, math.floor(image.height * y / 100.0))
            right = min(image.width, math.ceil(image.width * (x + width) / 100.0))
            bottom = min(image.height, math.ceil(image.height * (y + height) / 100.0))
            if right - left < 2 or bottom - top < 2:
                raise ValueError(f"Vùng '{zone.get('label', index)}' quá nhỏ để OCR.")

            crop = image.crop((left, top, right, bottom))
            # Upscale vùng nhỏ để tăng độ rõ cho VietOCR/Tesseract nhưng giữ nguyên tọa độ gốc trả về.
            scale_factor = max(1.0, min(3.0, max(700.0 / crop.width, 100.0 / crop.height)))
            if scale_factor > 1.05:
                crop = crop.resize(
                    (round(crop.width * scale_factor), round(crop.height * scale_factor)),
                    Image.Resampling.LANCZOS,
                )
            crop_file_name = f"zone_{index:02d}.png"
            crop_path = os.path.join(crops_directory, crop_file_name)
            crop.save(crop_path, "PNG")
            if engine == "gemini":
                text, actual_engine = "", "gemini"
            else:
                text, actual_engine = run_zone_engine(crop_path, engine)
            results.append({
                "id": str(zone.get("id") or f"zone-{index}"),
                "fieldKey": str(zone.get("fieldKey") or ""),
                "label": str(zone.get("label") or ""),
                "page": page_number,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "pixelX": left,
                "pixelY": top,
                "pixelWidth": right - left,
                "pixelHeight": bottom - top,
                "text": text,
                "engine": actual_engine,
                "cropFileName": crop_file_name,
            })
    finally:
        for image in page_images.values():
            image.close()
        for page_number in page_metadata:
            page_path = os.path.join(crops_directory, f"__page_{page_number:04d}.png")
            with contextlib.suppress(OSError):
                os.remove(page_path)

    return {"engine": engine, "zones": results}


def extract_text(input_path, engine):
    extension = Path(input_path).suffix.lower()
    if extension == ".docx":
        return extract_docx_text(input_path)

    page_results = []
    with tempfile.TemporaryDirectory(prefix="idpdms_ocr_") as temporary_directory:
        for page_number, page_path in render_input_pages(input_path, temporary_directory):
            page_text = run_image_engine(page_path, engine).strip()
            if page_text:
                if extension in {".pdf", ".tif", ".tiff"}:
                    page_results.append(f"--- Trang {page_number} ---\n{page_text}")
                else:
                    page_results.append(page_text)
    return "\n\n".join(page_results)


def find_unicode_fonts(normal_font=None, bold_font=None):
    normal_candidates = [
        normal_font,
        os.environ.get("IDPDMS_PDF_FONT"),
        r"C:\Windows\Fonts\arial.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    bold_candidates = [
        bold_font,
        os.environ.get("IDPDMS_PDF_FONT_BOLD"),
        r"C:\Windows\Fonts\arialbd.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]

    normal = next((candidate for candidate in normal_candidates if candidate and os.path.isfile(candidate)), None)
    bold = next((candidate for candidate in bold_candidates if candidate and os.path.isfile(candidate)), None)
    if not normal or not bold:
        raise RuntimeError(
            "Không tìm thấy font TrueType Unicode. Hãy cấu hình IDPDMS_PDF_FONT và "
            "IDPDMS_PDF_FONT_BOLD hoặc cài Arial/DejaVu Sans."
        )
    return normal, bold


def generate_digitized_pdf(output_path, text, metadata, normal_font=None, bold_font=None):
    """Generate a paginated Unicode PDF report containing OCR metadata and full text."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    normal_path, bold_path = find_unicode_fonts(normal_font, bold_font)
    pdfmetrics.registerFont(TTFont("IDPDMSArial", normal_path))
    pdfmetrics.registerFont(TTFont("IDPDMSArialBold", bold_path))

    class NumberedCanvas(canvas.Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            page_count = len(self._saved_page_states)
            for page_number, state in enumerate(self._saved_page_states, start=1):
                self.__dict__.update(state)
                self.setFont("IDPDMSArial", 8)
                self.setFillColor(colors.HexColor("#64748b"))
                footer = f"IDP.DMS • Tài liệu số hóa • Trang {page_number}/{page_count}"
                self.drawCentredString(A4[0] / 2, 12 * mm, footer)
                canvas.Canvas.showPage(self)
            canvas.Canvas.save(self)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=22 * mm,
        title=metadata.get("title", "Tài liệu số hóa OCR"),
        author="IDP.DMS",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "VietnameseTitle", parent=styles["Title"], fontName="IDPDMSArialBold",
        fontSize=16, leading=21, alignment=TA_CENTER,
        textColor=colors.HexColor("#0f3d73"), spaceAfter=10,
    )
    heading_style = ParagraphStyle(
        "VietnameseHeading", parent=styles["Heading2"], fontName="IDPDMSArialBold",
        fontSize=12, leading=16, textColor=colors.HexColor("#0f3d73"),
        spaceBefore=8, spaceAfter=7,
    )
    body_style = ParagraphStyle(
        "VietnameseBody", parent=styles["BodyText"], fontName="IDPDMSArial",
        fontSize=10.5, leading=16, alignment=TA_JUSTIFY,
        splitLongWords=True, spaceAfter=5,
    )
    label_style = ParagraphStyle("MetadataLabel", parent=body_style, fontName="IDPDMSArialBold", fontSize=9.5)
    value_style = ParagraphStyle("MetadataValue", parent=body_style, fontSize=9.5)

    story = [
        Paragraph("HỆ THỐNG QUẢN LÝ VÀ SỐ HÓA HỒ SƠ IDP.DMS", title_style),
        Paragraph("PHIÊN BẢN PDF SỐ HÓA OCR", heading_style),
    ]
    metadata_rows = []
    for label, key in [
        ("Mã tài liệu", "code"),
        ("Tên tài liệu", "title"),
        ("Tệp nguồn", "source"),
        ("Công cụ OCR", "engine"),
        ("Thời gian số hóa", "created_at"),
    ]:
        value = str(metadata.get(key) or "—")
        metadata_rows.append([
            Paragraph(html.escape(label), label_style),
            Paragraph(html.escape(value), value_style),
        ])

    metadata_table = Table(metadata_rows, colWidths=[42 * mm, 116 * mm])
    metadata_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "IDPDMSArial"),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eaf2fb")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([metadata_table, Spacer(1, 8 * mm), Paragraph("TOÀN VĂN OCR BÓC TÁCH", heading_style)])

    normalized_text = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized_text:
        normalized_text = "Không có nội dung OCR."
    for block in normalized_text.split("\n\n"):
        escaped_block = "<br/>".join(html.escape(line) for line in block.split("\n"))
        story.append(Paragraph(escaped_block or "&nbsp;", body_style))

    document.build(story, canvasmaker=NumberedCanvas)


def parse_arguments():
    parser = argparse.ArgumentParser(description="IDP.DMS OCR and Unicode PDF engine")
    parser.add_argument("input", nargs="?", help="Ảnh, TIFF, DOCX hoặc PDF cần OCR")
    parser.add_argument("--engine", default="easyocr", choices=["easyocr", "crnn", "vietocr", "tesseract", "gemini"])
    parser.add_argument("--render-page", action="store_true")
    parser.add_argument("--page", type=int, default=1)
    parser.add_argument("--ocr-zones", action="store_true")
    parser.add_argument("--zones-file")
    parser.add_argument("--zones-output")
    parser.add_argument("--crops-dir")
    parser.add_argument("--generate-pdf", action="store_true")
    parser.add_argument("--output")
    parser.add_argument("--text-file")
    parser.add_argument("--code", default="")
    parser.add_argument("--title", default="")
    parser.add_argument("--source", default="")
    parser.add_argument("--created-at", default="")
    parser.add_argument("--ocr-engine", default="")
    parser.add_argument("--font")
    parser.add_argument("--bold-font")
    return parser.parse_args()


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    arguments = parse_arguments()

    try:
        if arguments.render_page:
            if not arguments.input or not arguments.output:
                raise ValueError("Đường dẫn input và --output là bắt buộc khi render trang.")
            metadata = render_page(arguments.input, arguments.page, arguments.output)
            print(json.dumps(metadata, ensure_ascii=False))
            return

        if arguments.ocr_zones:
            if not arguments.input or not arguments.zones_file or not arguments.zones_output or not arguments.crops_dir:
                raise ValueError("Input, --zones-file, --zones-output và --crops-dir là bắt buộc khi OCR theo vùng.")
            with contextlib.redirect_stdout(io.StringIO()):
                result = extract_zones(arguments.input, arguments.zones_file, arguments.crops_dir, arguments.engine)
            Path(arguments.zones_output).write_text(
                json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(arguments.zones_output)
            return

        if arguments.generate_pdf:
            if not arguments.output or not arguments.text_file:
                raise ValueError("--output và --text-file là bắt buộc khi dùng --generate-pdf.")
            text = Path(arguments.text_file).read_text(encoding="utf-8")
            generate_digitized_pdf(
                arguments.output,
                text,
                {
                    "code": arguments.code,
                    "title": arguments.title,
                    "source": arguments.source,
                    "created_at": arguments.created_at or datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
                    "engine": arguments.ocr_engine,
                },
                arguments.font,
                arguments.bold_font,
            )
            print(arguments.output)
            return

        if not arguments.input:
            raise ValueError("Thiếu đường dẫn tệp cần OCR.")
        with contextlib.redirect_stdout(io.StringIO()):
            text = extract_text(arguments.input, arguments.engine)
        print(text)
    except Exception as error:
        import traceback

        print(f"ERROR: {error}\n{traceback.format_exc()}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
