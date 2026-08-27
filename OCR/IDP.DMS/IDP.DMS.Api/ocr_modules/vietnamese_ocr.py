from tensorflow import keras
from keras.layers import Dense, LSTM, Reshape, BatchNormalization, Input, Conv2D, MaxPool2D, Lambda, Bidirectional, Add, Activation
from keras.models import Model
from keras.activations import relu, sigmoid, softmax
import keras.backend as K
import tensorflow as tf
from keras.utils import to_categorical
from keras.callbacks import CSVLogger, TensorBoard, ModelCheckpoint, EarlyStopping, ReduceLROnPlateau

import numpy as np

import ocr_modules.crnn_model as crnn_model

# Constant
NO_PREDICTS = 1
OFFSET = 0
char_list = [' ', '#', "'", '(', ')', '+', ',', '-', '.',
             '/', '0', '1', '2', '3', '4', '5', '6', '7',
             '8', '9', ':', 'A', 'B', 'C', 'D', 'E', 'F',
             'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
             'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
             'Y', 'a', 'b', 'c', 'd', 'e', 'g', 'h', 'i',
             'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
             't', 'u', 'v', 'w', 'x', 'y', 'z', '\u00c2', '\u00ca',
             '\u00d4', '\u00e0', '\u00e1', '\u00e2', '\u00e3', '\u00e8', '\u00e9', '\u00ea', '\u00ec',
             '\u00ed', '\u00f2', '\u00f3', '\u00f4', '\u00f5', '\u00f9', '\u00fa', '\u00fd', '\u0103',
             '\u0110', '\u0111', '\u0129', '\u0169', '\u01a0', '\u01a1', '\u01b0', '\u1ea1', '\u1ea3',
             '\u1ea5', '\u1ea7', '\u1ea9', '\u1eab', '\u1ead', '\u1eaf', '\u1eb1', '\u1eb5', '\u1eb7', '\u1ebb',
             '\u1ebd', '\u1ebf', '\u1ec1', '\u1ec3', '\u1ec5', '\u1ec7', '\u1ec9', '\u1ecb', '\u1ecd',
             '\u1ecf', '\u1ed1', '\u1ed3', '\u1ed5', '\u1ed7', '\u1ed9', '\u1edb', '\u1edd', '\u1edf',
             '\u1ee1', '\u1ee3', '\u1ee5', '\u1ee7', '\u1ee8', '\u1ee9', '\u1eeb', '\u1eed', '\u1eef',
             '\u1ef1', '\u1ef3', '\u1ef5', '\u1ef7', '\u1ef9']


def prediction_ocr(valid_img):
    prediction = crnn_model.model.predict(valid_img[OFFSET:OFFSET+NO_PREDICTS])
    decoded = tf.keras.backend.ctc_decode(prediction, input_length=np.ones(prediction.shape[0])*prediction.shape[1], greedy=True)[0][0]
    out = decoded.numpy() if hasattr(decoded, 'numpy') else decoded
    
    pred = ""
    for x in out:
        for p in x:
            if int(p) != -1:
                pred += char_list[int(p)]
    return pred


def prediction_ocr_multi(valid_img, SIZE):
    prediction = crnn_model.model.predict(valid_img[OFFSET:OFFSET+SIZE])
    decoded = tf.keras.backend.ctc_decode(prediction, input_length=np.ones(prediction.shape[0])*prediction.shape[1], greedy=True)[0][0]
    out = decoded.numpy() if hasattr(decoded, 'numpy') else decoded
    
    all_predictions = []
    for x in out:
        pred = ""
        for p in x:
            if int(p) != -1:
                pred += char_list[int(p)]
        all_predictions.append(pred)
    return '\n'.join(all_predictions)
