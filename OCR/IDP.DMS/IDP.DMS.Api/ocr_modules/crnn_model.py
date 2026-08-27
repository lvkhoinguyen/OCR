# import our model, different layers and activation function
import os
from tensorflow import keras
from keras.layers import Dense, LSTM, Reshape, BatchNormalization, Input, Conv2D, MaxPool2D, Lambda, Bidirectional, Add, Activation
from keras.models import Model
import keras.backend as K


# CRNN and LSTM model for character recognition

# input
inputs = Input(shape=(118, 2167, 1))

# Block 1
x = Conv2D(64, (3, 3), padding='same')(inputs)
x = MaxPool2D(pool_size=3, strides=3)(x)
x = Activation('relu')(x)
x_1 = x

# Block 2
x = Conv2D(128, (3, 3), padding='same')(x)
x = MaxPool2D(pool_size=3, strides=3)(x)
x = Activation('relu')(x)
x_2 = x

# Block 3
x = Conv2D(256, (3, 3), padding='same')(x)
x = BatchNormalization()(x)
x = Activation('relu')(x)
x_3 = x

# Block4
x = Conv2D(256, (3, 3), padding='same')(x)
x = BatchNormalization()(x)
x = Add()([x, x_3])
x = Activation('relu')(x)
x_4 = x

# Block5
x = Conv2D(512, (3, 3), padding='same')(x)
x = BatchNormalization()(x)
x = Activation('relu')(x)
x_5 = x

# Block6
x = Conv2D(512, (3, 3), padding='same')(x)
x = BatchNormalization()(x)
x = Add()([x, x_5])
x = Activation('relu')(x)

# Block7
x = Conv2D(1024, (3, 3), padding='same')(x)
x = BatchNormalization()(x)
x = MaxPool2D(pool_size=(3, 1))(x)
x = Activation('relu')(x)

x = MaxPool2D(pool_size=(3, 1))(x)

squeezed = Reshape((-1, 1024))(x)

blstm_1 = Bidirectional(
    LSTM(512, return_sequences=True, dropout=0.2))(squeezed)
blstm_2 = Bidirectional(LSTM(512, return_sequences=True, dropout=0.2))(blstm_1)

outputs = Dense(140+1, activation='softmax')(blstm_2)

model = Model(inputs, outputs)

# Load model weights - use path relative to this file
_weights_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ocr_models', 'model_weights.hdf5')
model.load_weights(_weights_path)
