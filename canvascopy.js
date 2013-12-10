

// Choose upsampling or downsampling based on how content is being resized.
function copyResized(source, dest) {
  if (source.width > dest.width) {
    return copyGaussian(source, dest);
  } else {
    return copyBicubic(source, dest);
  }
}


// Gaussian downsampling
function copyGaussian(source, dest) {
  var sampleX = source.width / dest.width;
  var sampleY = source.height / dest.height;

  var tuning = 10;

  function hypot(x,y) {
    return Math.sqrt(x*x + y*y);
  }

  function gauss(x, y) {
    return (1 / (12 * tuning)) * Math.pow(2.718, (x * x + y * y) / (2 * tuning * tuning));
  }

  function getGaussianPixel(imageData, x, y) {
    var r = 0;
    var b = 0;
    var g = 0;
    var a = 0;
    var n = 0;
    var width = imageData.width;
    var height = imageData.height;
    var data = imageData.data;
    var x0 = Math.max(x, 0) | 0;
    var x1 = Math.min(x + sampleX, width) | 0;
    var y0 = Math.max(y, 0) | 0;
    var y1 = Math.min(y + sampleY, height) | 0;
    var total = 0;
    for (var xs = x0; xs < x1; xs++) {
      for (var ys = y0; ys < y1; ys++) {
        var idx = (ys * width + xs) * 4;
        var factor = gauss((x - xs) / sampleX, (y - ys) / sampleY);
        r += data[idx] * factor;
        g += data[idx+1] * factor;
        b += data[idx+2] * factor;
        a += data[idx+3] * factor;
        total += factor;
      }
    }
    return [r/total|0,g/total|0,b/total|0,a/total|0];
  }

  for (var y = 0; y < dest.height; y++) {
    for (var x = 0; x < dest.width; x++) {
      var i = (y * dest.width + x) * 4;
      var newPixel = getGaussianPixel(source,
                                      x * source.width / dest.width,
                                      y * source.height / dest.height);
      dest.data[i] = newPixel[0];
      dest.data[i+1] = newPixel[1];
      dest.data[i+2] = newPixel[2];
      dest.data[i+3] = newPixel[3];
    }
  }
  return dest;
}


// Bilinear interpolation
function copyBilinear(source, dest) {
  function getPixel(imageData, x, y) {
    var width = imageData.width;
    var height = imageData.data.length / 4 / width;
    var data = imageData.data;
    if (x < 0 | x >= width | y < 0 | y >= height) {
      return [128, 128, 128, 0];
    }
    var idx = (y * width + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
  }

  function getPixelBi(data, x, y) {
    var fx = x|0;
    var fy = y|0;
    if (fx === x && fy === y) {
      return getPixel(data, fx, fy);
    }
    return int(int(getPixel(data, fx, fy), getPixel(data, fx+1, fy), x % 1),
               int(getPixel(data, fx, fy+1), getPixel(data, fx+1, fy+1), x % 1), y % 1);
  }

  function int(n, m, i) {
    return [
      mix(n[0], m[0], i),
      mix(n[1], m[1], i),
      mix(n[2], m[2], i),
      mix(n[3], m[3], i)
    ]
  }

  function mix(n, m, i) {
    return (1 - i) * n + i * m;
  }

  for (var y = 0; y < dest.height; y++) {
    for (var x = 0; x < dest.width; x++) {
      var i = (y * dest.width + x) * 4;
      var newPixel = getPixelBi(source,
                                x * source.width / dest.width,
                                y * source.height / dest.height);
      dest.data[i] = newPixel[0];
      dest.data[i+1] = newPixel[1];
      dest.data[i+2] = newPixel[2];
      dest.data[i+3] = newPixel[3];
    }
  }

  return dest;
}


// Bicubic interpolation
function copyBicubic(source, dest) {

  function getPixel(imageData, x, y) {
    var x1 = x | 0;
    var y1 = y | 0;
    var width = imageData.width;
    var height = imageData.height;
    var data = imageData.data;
    var pixel = [];
    var x0 = Math.max(x1 - 1, 0);
    var x2 = Math.min(x1 + 1, width-1);
    var x3 = Math.min(x1 + 2, width-1);
    var y0 = Math.max(y1 - 1, 0);
    var y2 = Math.min(y1 + 1, height-1);
    var y3 = Math.min(y1 + 2, height-1);
    for (var offset = 0; offset < 4; offset++) {
      newVal = bicubic(x % 1, y % 1,
        data[(y0 * width + x0) * 4 + offset],
        data[(y1 * width + x0) * 4 + offset],
        data[(y2 * width + x0) * 4 + offset],
        data[(y3 * width + x0) * 4 + offset],
        data[(y0 * width + x1) * 4 + offset],
        data[(y1 * width + x1) * 4 + offset],
        data[(y2 * width + x1) * 4 + offset],
        data[(y3 * width + x1) * 4 + offset],
        data[(y0 * width + x2) * 4 + offset],
        data[(y1 * width + x2) * 4 + offset],
        data[(y2 * width + x2) * 4 + offset],
        data[(y3 * width + x2) * 4 + offset],
        data[(y0 * width + x3) * 4 + offset],
        data[(y1 * width + x3) * 4 + offset],
        data[(y2 * width + x3) * 4 + offset],
        data[(y3 * width + x3) * 4 + offset]
      );
      pixel.push(newVal);
    }
    return pixel;
  }

  function bicubic(x, y, p00, p01, p02, p03, p10, p11, p12, p13, p20, p21, p22, p23, p30, p31, p32, p33) {
    var x2 = x * x;
    var x3 = x2 * x;
    var y2 = y * y;
    var y3 = y2 * y;

    var a00 = p11;
    var a01 = -.5*p10 + .5*p12;
    var a02 = p10 - 2.5*p11 + 2*p12 - .5*p13;
    var a03 = -.5*p10 + 1.5*p11 - 1.5*p12 + .5*p13;
    var a10 = -.5*p01 + .5*p21;
    var a11 = .25*p00 - .25*p02 - .25*p20 + .25*p22;
    var a12 = -.5*p00 + 1.25*p01 - p02 + .25*p03 + .5*p20 - 1.25*p21 + p22 - .25*p23;
    var a13 = .25*p00 - .75*p01 + .75*p02 - .25*p03 - .25*p20 + .75*p21 - .75*p22 + .25*p23;
    var a20 = p01 - 2.5*p11 + 2*p21 - .5*p31;
    var a21 = -.5*p00 + .5*p02 + 1.25*p10 - 1.25*p12 - p20 + p22 + .25*p30 - .25*p32;
    var a22 = p00 - 2.5*p01 + 2*p02 - .5*p03 - 2.5*p10 + 6.25*p11 - 5*p12 + 1.25*p13 + 2*p20 - 5*p21 + 4*p22 - p23 - .5*p30 + 1.25*p31 - p32 + .25*p33;
    var a23 = -.5*p00 + 1.5*p01 - 1.5*p02 + .5*p03 + 1.25*p10 - 3.75*p11 + 3.75*p12 - 1.25*p13 - p20 + 3*p21 - 3*p22 + p23 + .25*p30 - .75*p31 + .75*p32 - .25*p33;
    var a30 = -.5*p01 + 1.5*p11 - 1.5*p21 + .5*p31;
    var a31 = .25*p00 - .25*p02 - .75*p10 + .75*p12 + .75*p20 - .75*p22 - .25*p30 + .25*p32;
    var a32 = -.5*p00 + 1.25*p01 - p02 + .25*p03 + 1.5*p10 - 3.75*p11 + 3*p12 - .75*p13 - 1.5*p20 + 3.75*p21 - 3*p22 + .75*p23 + .5*p30 - 1.25*p31 + p32 - .25*p33;
    var a33 = .25*p00 - .75*p01 + .75*p02 - .25*p03 - .75*p10 + 2.25*p11 - 2.25*p12 + .75*p13 + .75*p20 - 2.25*p21 + 2.25*p22 - .75*p23 - .25*p30 + .75*p31 - .75*p32 + .25*p33;

    return (a00 + a01 * y + a02 * y2 + a03 * y3) +
           (a10 + a11 * y + a12 * y2 + a13 * y3) * x +
           (a20 + a21 * y + a22 * y2 + a23 * y3) * x2 +
           (a30 + a31 * y + a32 * y2 + a33 * y3) * x3;
  }

  for (var y = 0; y < dest.height; y++) {
    for (var x = 0; x < dest.width; x++) {
      var i = (y * dest.width + x) * 4;
      var newPixel = getPixel(source,
                              x * source.width / dest.width,
                              y * source.height / dest.height);
      dest.data[i] = newPixel[0];
      dest.data[i+1] = newPixel[1];
      dest.data[i+2] = newPixel[2];
      dest.data[i+3] = newPixel[3];
    }
  }

  return dest;
}


