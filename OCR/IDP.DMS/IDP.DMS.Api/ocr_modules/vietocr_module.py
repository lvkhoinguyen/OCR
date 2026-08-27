from PIL import Image
import os

from vietocr.tool.predictor import Predictor
from vietocr.tool.config import Cfg

# Cache model để không tải lại mỗi lần gọi predict
_detector = None

def _get_detector():
    """Trả về Predictor đã được cache. Khởi tạo lần đầu khi cần."""
    global _detector
    if _detector is None:
        config = Cfg.load_config_from_name('vgg_transformer')
        config['device'] = 'cpu'

        _base_dir = os.path.dirname(os.path.abspath(__file__))
        _models_dir = os.path.join(_base_dir, '..', 'ocr_models')

        # Ưu tiên dùng file mới nhất (final), fallback về file cũ nếu không có
        _weights_final = os.path.normpath(os.path.join(_models_dir, 'vgg_transformer_export_final.pth'))
        _weights_v1    = os.path.normpath(os.path.join(_models_dir, 'vgg_transformer_export.pth'))

        if os.path.exists(_weights_final):
            config['weights'] = _weights_final
            print(f'[VietOCR] Dùng model: vgg_transformer_export_final.pth')
        elif os.path.exists(_weights_v1):
            config['weights'] = _weights_v1
            print(f'[VietOCR] Dùng model: vgg_transformer_export.pth')
        else:
            print('[VietOCR] Không tìm thấy file weights! Dùng pretrained mặc định.')
            config['cnn']['pretrained'] = True

        config['cnn']['pretrained'] = False
        _detector = Predictor(config)
    return _detector


def vietOCR_prediction(input):
    detector = _get_detector()
    return detector.predict(input)
