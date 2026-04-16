#!/bin/bash

# Create output directory
mkdir -p assets/img_ultracompressed

# Ultra compression settings
for img in assets/img/*.png; do
    output="assets/img_ultracompressed/$(basename "$img")"
    echo "Processing $img..."
    
    pngquant --quality=60-80 --speed=1 --force --output "$output" "$img"
done

echo "Ultra compression complete!"