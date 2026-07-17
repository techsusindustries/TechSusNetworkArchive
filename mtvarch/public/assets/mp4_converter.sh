#!/bin/bash

# Usage: ./mp4_converter.sh --file video.mkv

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --file) INPUT="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$INPUT" ]; then
    echo "Error: No input file specified. Use --file <filename>"
    exit 1
fi

OUTPUT_NAME="${INPUT%.*}"
OUTPUT="${OUTPUT_NAME}.mp4"

echo "Starting conversion for $INPUT to $OUTPUT..."

# Convert to browser-compatible MP4 with H.264 video and AAC audio
ffmpeg -i "$INPUT" \
    -c:v libx264 \
    -profile:v baseline \
    -level 4.0 \
    -pix_fmt yuv420p \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -c:a aac \
    -strict experimental \
    -b:a 128k \
    -movflags +faststart \
    "$OUTPUT"

echo "Done! Converted file is $OUTPUT"