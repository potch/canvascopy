canvascopy
==========

implementations of canvas scaling and interpolation methods

## Methods

### copyResized

Checks the input and output dimensions, and selects Gaussian downsampling if the destination is smaller, and Bicubic upsampling if the destination is larger.

### copyBilinear

Resize using Bilinear upsampling.

### copyBicubic

Resize using Bicubic upsampling.

### copyGaussian

Resize using Bilinear downsampling.
