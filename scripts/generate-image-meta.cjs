const fs = require('fs');
const path = require('path');
const { imageSize } = require('image-size');

const IMAGE_DIR = path.join(__dirname, '../src/assets/images/compressed');
const OUTPUT_FILE = path.join(__dirname, '../src/assets/data/image-sizes.json');

function generate() {
    const files = fs.readdirSync(IMAGE_DIR).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
    });

    const meta = {};
    for (const file of files) {
        const filePath = path.join(IMAGE_DIR, file);
        try {
            const buffer = fs.readFileSync(filePath);
            const dimensions = imageSize(buffer);
            meta[file] = {
                width: dimensions.width,
                height: dimensions.height,
                aspectRatio: parseFloat((dimensions.width / dimensions.height).toFixed(4))
            };
        } catch (err) {
            console.error(`Failed to read dimensions for ${file}:`, err.message);
        }
    }

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(meta, null, 2));
    console.log(`Generated ${OUTPUT_FILE} with ${Object.keys(meta).length} images.`);
}

generate();
