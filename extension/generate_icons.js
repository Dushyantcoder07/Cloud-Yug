#!/usr/bin/env node
/**
 * Quick script to generate simple PNG icon placeholders
 * Creates minimal valid PNG files for the extension
 */

const fs = require('fs');
const path = require('path');

// Minimal PNG creator - generates a solid colored PNG
function createPNG(width, height, r, g, b) {
    // PNG file structure
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 2; // color type (RGB)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = createChunk('IHDR', ihdrData);

    // IDAT chunk - uncompressed image data
    // Each row: filter byte + RGB pixels
    const rowBytes = 1 + width * 3;
    const rawData = Buffer.alloc(rowBytes * height);

    for (let y = 0; y < height; y++) {
        const rowOffset = y * rowBytes;
        rawData[rowOffset] = 0; // no filter
        for (let x = 0; x < width; x++) {
            const px = rowOffset + 1 + x * 3;
            // Create a gradient shield look
            const cx = width / 2;
            const cy = height / 2;
            const dx = (x - cx) / cx;
            const dy = (y - cy) / cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= 0.85) {
                // Inside circle - gradient from blue to purple
                const t = x / width;
                rawData[px] = Math.round(37 + t * (124 - 37));     // R: 37 -> 124
                rawData[px + 1] = Math.round(99 + t * (58 - 99));  // G: 99 -> 58
                rawData[px + 2] = Math.round(235 + t * (237 - 235)); // B: 235 -> 237

                // White shield in center
                const shieldDist = Math.abs(dx) * 1.5 + Math.max(0, dy - 0.1) * 1.2;
                if (shieldDist < 0.45 && dy < 0.5 && dy > -0.4) {
                    rawData[px] = 255;
                    rawData[px + 1] = 255;
                    rawData[px + 2] = 255;
                }
            } else {
                // Outside - transparent (white for RGB)
                rawData[px] = 248;
                rawData[px + 1] = 250;
                rawData[px + 2] = 252;
            }
        }
    }

    // Compress with deflate (use zlib)
    const zlib = require('zlib');
    const compressed = zlib.deflateSync(rawData);
    const idat = createChunk('IDAT', compressed);

    // IEND chunk
    const iend = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuffer, data]);

    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);

    return Buffer.concat([length, typeBuffer, data, crc]);
}

// CRC32 implementation
function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

[16, 48, 128].forEach(size => {
    const png = createPNG(size, size, 37, 99, 235);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
    console.log(`Created icon${size}.png`);
});

console.log('Done! Icons created in icons/ folder.');
