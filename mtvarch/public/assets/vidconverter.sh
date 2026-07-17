#!/bin/bash

# Usage: ./vidconverter.sh --file video.mp4

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
OUTPUT_DIR="./${OUTPUT_NAME}_hls"

mkdir -p "$OUTPUT_DIR"

echo "Starting conversion for $INPUT..."

ffmpeg -i "$INPUT" \
    -c:v libx264 -pix_fmt yuv420p -crf 20 -preset fast \
    -c:a aac -b:a 192k \
    -g 360 -keyint_min 360 -sc_threshold 0 \
    -f hls \
    -hls_time 6 \
    -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/seg_%03d.ts" \
    "$OUTPUT_DIR/index.m3u8"

echo "Done! Stream files are in $OUTPUT_DIR"
