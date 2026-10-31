import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "public", "icons");
mkdirSync(OUT_DIR, { recursive: true });

/* ---------- tiny PNG encoder (no dependencies) ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePNG(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy
      ? rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
      : Buffer.from(rgba).copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- illustration ---------- */

function mix(a, b, t) {
  return a + (b - a) * t;
}

function hex(value) {
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ];
}

function render(size, contentScale) {
  const SS = 4;
  const big = size * SS;
  const pixels = new Uint8ClampedArray(big * big * 4);

  const top = hex("#F8DDB0");
  const mid = hex("#E9B36A");
  const bottom = hex("#BE6345");

  const insideEllipse = (u, v, cx, cy, rx, ry) =>
    ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;

  const blend = (x, y, color, alpha = 1) => {
    if (x < 0 || y < 0 || x >= big || y >= big || alpha <= 0) return;
    const index = (y * big + x) * 4;
    const dstAlpha = pixels[index + 3] / 255;
    const outAlpha = alpha + dstAlpha * (1 - alpha);
    if (outAlpha <= 0) return;
    pixels[index] = (color[0] * alpha + pixels[index] * dstAlpha * (1 - alpha)) / outAlpha;
    pixels[index + 1] = (color[1] * alpha + pixels[index + 1] * dstAlpha * (1 - alpha)) / outAlpha;
    pixels[index + 2] = (color[2] * alpha + pixels[index + 2] * dstAlpha * (1 - alpha)) / outAlpha;
    pixels[index + 3] = outAlpha * 255;
  };

  const fill = (u, v, color, alpha = 1) => blend(Math.floor(u * big), Math.floor(v * big), color, alpha);

  const ellipse = (cx, cy, rx, ry, color, alpha = 1) => {
    const x0 = Math.max(0, Math.floor((cx - rx) * big));
    const x1 = Math.min(big - 1, Math.ceil((cx + rx) * big));
    const y0 = Math.max(0, Math.floor((cy - ry) * big));
    const y1 = Math.min(big - 1, Math.ceil((cy + ry) * big));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (insideEllipse((x + 0.5) / big, (y + 0.5) / big, cx, cy, rx, ry)) {
          blend(x, y, color, alpha);
        }
      }
    }
  };

  const circle = (cx, cy, r, color, alpha = 1) => ellipse(cx, cy, r, r, color, alpha);

  const line = (x1, y1, x2, y2, width, color, alpha = 1) => {
    const dx = (x2 - x1) * big;
    const dy = (y2 - y1) * big;
    const lengthSq = dx * dx + dy * dy;
    const half = (width * big) / 2;
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) * big - half - 1));
    const maxX = Math.min(big - 1, Math.ceil(Math.max(x1, x2) * big + half + 1));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) * big - half - 1));
    const maxY = Math.min(big - 1, Math.ceil(Math.max(y1, y2) * big + half + 1));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const px = x + 0.5 - x1 * big;
        const py = y + 0.5 - y1 * big;
        let t = (px * dx + py * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        const dist = Math.hypot(px - t * dx, py - t * dy);
        if (dist <= half) blend(x, y, color, alpha);
      }
    }
  };

  // Background: warm vertical gradient with a soft glow near the top.
  for (let y = 0; y < big; y += 1) {
    const t = y / big;
    const color =
      t < 0.5
        ? [
            mix(top[0], mid[0], t * 2),
            mix(top[1], mid[1], t * 2),
            mix(top[2], mid[2], t * 2),
          ]
        : [
            mix(mid[0], bottom[0], (t - 0.5) * 2),
            mix(mid[1], bottom[1], (t - 0.5) * 2),
            mix(mid[2], bottom[2], (t - 0.5) * 2),
          ];
    for (let x = 0; x < big; x += 1) {
      const index = (y * big + x) * 4;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = 255;
    }
  }

  // Soft light near the top.
  for (let y = 0; y < big; y += 1) {
    const ny = (y + 0.5) / big;
    for (let x = 0; x < big; x += 1) {
      const nx = (x + 0.5) / big;
      const dist = Math.hypot(nx - 0.5, ny - 0.3);
      if (dist < 0.55) {
        blend(x, y, [255, 249, 238], 0.16 * (1 - dist / 0.55));
      }
    }
  }

  // Map content space into the canvas, leaving a safe margin for maskable icons.
  const cu = (value) => 0.5 + (value - 0.5) * contentScale;
  const fromCanvas = (value) => 0.5 + (value - 0.5) / contentScale;
  const drawEllipse = (cx, cy, rx, ry, color, alpha) =>
    ellipse(cu(cx), cu(cy), rx * contentScale, ry * contentScale, color, alpha);
  const drawCircle = (cx, cy, r, color, alpha) =>
    circle(cu(cx), cu(cy), r * contentScale, color, alpha);
  const drawLine = (x1, y1, x2, y2, width, color, alpha) =>
    line(
      cu(x1),
      cu(y1),
      cu(x2),
      cu(y2),
      width * contentScale,
      color,
      alpha,
    );

  // Steam
  const steam = hex("#FFF9EE");
  for (const [index, sx] of [0.37, 0.5, 0.63].entries()) {
    for (let step = 0; step <= 90; step += 1) {
      const t = step / 90;
      const sy = 0.4 - t * 0.18;
      const wobble = Math.sin(t * Math.PI * 2.2 + index * 1.7) * 0.012;
      drawCircle(sx + wobble, sy, 0.017 * (1 - t * 0.25), steam, 0.78);
    }
  }

  // Chopsticks
  drawLine(0.665, 0.22, 0.885, 0.445, 0.022, hex("#8A5535"), 0.95);
  drawLine(0.715, 0.19, 0.915, 0.415, 0.022, hex("#8A5535"), 0.95);

  // Shadow
  drawEllipse(0.5, 0.805, 0.3, 0.032, hex("#5A321E"), 0.18);

  // Bowl body (lower half of an ellipse), with a soft vertical shade.
  const bowlX0 = Math.floor(cu(0.195) * big);
  const bowlX1 = Math.ceil(cu(0.805) * big);
  const bowlY0 = Math.floor(cu(0.545) * big);
  const bowlY1 = Math.ceil(cu(0.82) * big);
  for (let y = bowlY0; y <= bowlY1; y += 1) {
    for (let x = bowlX0; x <= bowlX1; x += 1) {
      const u = (x + 0.5) / big;
      const v = (y + 0.5) / big;
      const cuv = fromCanvas(u);
      const cvv = fromCanvas(v);
      if (
        cvv >= 0.545 &&
        insideEllipse(cuv, cvv, 0.5, 0.545, 0.305, 0.27)
      ) {
        const t = Math.min(1, (cvv - 0.545) / 0.27);
        blend(
          x,
          y,
          [
            mix(255, 234, t),
            mix(253, 216, t),
            mix(248, 187, t),
          ],
          1,
        );
      }
    }
  }

  // Rim and soup
  drawEllipse(0.5, 0.545, 0.328, 0.074, hex("#E5C39B"), 1);
  drawEllipse(0.5, 0.545, 0.315, 0.065, hex("#FFFDF7"), 1);
  drawEllipse(0.5, 0.55, 0.29, 0.052, hex("#E39A38"), 1);
  drawEllipse(0.49, 0.545, 0.255, 0.037, hex("#F0BA63"), 0.75);

  // Soup garnish
  drawCircle(0.43, 0.55, 0.019, hex("#D96B4A"), 1);
  drawCircle(0.555, 0.56, 0.022, hex("#7F9A72"), 1);
  drawCircle(0.615, 0.545, 0.014, hex("#D96B4A"), 0.9);
  drawCircle(0.465, 0.568, 0.013, hex("#FFF0D2"), 1);
  drawCircle(0.37, 0.558, 0.012, hex("#7F9A72"), 0.9);

  // Heart on the bowl (two circles + a triangle = a crisp, readable heart)
  const heart = hex("#C26A4A");
  const heartY = 0.685;
  drawCircle(0.475, heartY, 0.031, heart, 0.95);
  drawCircle(0.525, heartY, 0.031, heart, 0.95);

  const triX0 = Math.floor(cu(0.44) * big);
  const triX1 = Math.ceil(cu(0.56) * big);
  const triY0 = Math.floor(cu(heartY) * big);
  const triY1 = Math.ceil(cu(0.755) * big);
  for (let y = triY0; y <= triY1; y += 1) {
    for (let x = triX0; x <= triX1; x += 1) {
      const u = (x + 0.5) / big;
      const v = (y + 0.5) / big;
      const cuv = fromCanvas(u);
      const cvv = fromCanvas(v);
      if (cvv < heartY) continue;
      const width = 0.05 * (1 - (cvv - heartY) / (0.755 - heartY));
      if (Math.abs(cuv - 0.5) <= width) {
        blend(x, y, heart, 0.95);
      }
    }
  }

  // Little sparkles
  drawCircle(0.245, 0.31, 0.012, hex("#FFF6E3"), 0.65);
  drawCircle(0.79, 0.66, 0.014, hex("#F8D9A4"), 0.5);
  drawCircle(0.21, 0.68, 0.009, hex("#F8D9A4"), 0.4);

  // Downsample (4x SSAA).
  const output = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const index = ((y * SS + sy) * big + (x * SS + sx)) * 4;
          r += pixels[index];
          g += pixels[index + 1];
          b += pixels[index + 2];
        }
      }
      const samples = SS * SS;
      const out = (y * size + x) * 4;
      output[out] = Math.round(r / samples);
      output[out + 1] = Math.round(g / samples);
      output[out + 2] = Math.round(b / samples);
      output[out + 3] = 255;
    }
  }

  return encodePNG(size, size, output);
}

const targets = [
  ["icon-192.png", 192, 0.86],
  ["icon-512.png", 512, 0.86],
  ["icon-maskable-512.png", 512, 0.7],
  ["apple-touch-icon.png", 180, 0.86],
];

for (const [name, size, scale] of targets) {
  const png = render(size, scale);
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`✓ ${name} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}
