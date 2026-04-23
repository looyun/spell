const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ExifReader = require('exifreader');

const INPUT_DIR = path.join(__dirname, '../src/assets/images/original');
const OUTPUT_DIR = path.join(__dirname, '../src/assets/images/webp');

// Quality setting for WebP compression (0-100)
const WEBP_QUALITY = 80;

function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function createXmpBuffer(prompt, workflow) {
    const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:spell="https://github.com/looyun/spell">
      <spell:prompt>${escapeXml(prompt || '')}</spell:prompt>
      <spell:workflow>${escapeXml(workflow || '')}</spell:workflow>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
    return Buffer.from(xmp, 'utf-8');
}

function injectXmpChunk(webpBuffer, xmpBuffer) {
    const chunkSize = xmpBuffer.length;
    const paddedSize = chunkSize % 2 === 0 ? chunkSize : chunkSize + 1;
    const newFileSize = webpBuffer.length + 8 + paddedSize;

    const newBuffer = Buffer.alloc(newFileSize);

    // Copy the entire original WebP file
    webpBuffer.copy(newBuffer, 0, 0);
    // Update RIFF chunk size (total file size - 8)
    newBuffer.writeUInt32LE(newFileSize - 8, 4);

    // Append XMP chunk at the end
    const xmpOffset = webpBuffer.length;
    newBuffer.write('XMP ', xmpOffset);
    newBuffer.writeUInt32LE(chunkSize, xmpOffset + 4);
    xmpBuffer.copy(newBuffer, xmpOffset + 8);
    // Pad to even size if necessary
    if (chunkSize % 2 !== 0) {
        newBuffer.writeUInt8(0, xmpOffset + 8 + chunkSize);
    }

    return newBuffer;
}

async function processImage(filename) {
    const inputPath = path.join(INPUT_DIR, filename);
    const outputFilename = path.basename(filename, path.extname(filename)) + '.webp';
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    // Read original PNG metadata
    const pngBuffer = fs.readFileSync(inputPath);
    const tags = ExifReader.load(pngBuffer);
    const prompt = tags.prompt ? tags.prompt.value : '';
    const workflow = tags.workflow ? tags.workflow.value : '';

    // Convert PNG to compressed WebP using sharp
    const webpBuffer = await sharp(inputPath)
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer();

    // Inject XMP metadata into the WebP container
    const xmpBuffer = createXmpBuffer(prompt, workflow);
    const finalBuffer = injectXmpChunk(webpBuffer, xmpBuffer);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(outputPath, finalBuffer);

    const originalSize = fs.statSync(inputPath).size;
    const finalSize = finalBuffer.length;
    const ratio = ((1 - finalSize / originalSize) * 100).toFixed(1);

    console.log(
        `✓ ${filename} → ${outputFilename} ` +
        `(${ (originalSize / 1024 / 1024).toFixed(2) }MB → ${ (finalSize / 1024).toFixed(1) }KB, ` +
        `-${ratio}%, prompt: ${prompt ? '✓' : '✗'}, workflow: ${workflow ? '✓' : '✗'})`
    );
}

async function main() {
    if (!fs.existsSync(INPUT_DIR)) {
        console.error(`Input directory not found: ${INPUT_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(INPUT_DIR).filter((f) => /\.png$/i.test(f));
    if (files.length === 0) {
        console.log('No PNG images found in original directory.');
        return;
    }

    console.log(`Found ${files.length} PNG image(s). Converting to WebP with metadata...\n`);

    for (const file of files) {
        try {
            await processImage(file);
        } catch (err) {
            console.error(`✗ Failed to process ${file}:`, err.message);
        }
    }

    console.log('\nConversion complete!');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
