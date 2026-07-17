#!/usr/bin/env python3
"""
Download thumbnails from a YouTube playlist and convert to WebP format.
Names files as episode1-thumb.webp, episode2-thumb.webp, etc.
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def get_playlist_info(playlist_url: str) -> list[dict]:
    """Fetch playlist video information using yt-dlp."""
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--print-json",
        playlist_url,
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    
    videos = []
    for line in result.stdout.strip().split("\n"):
        if line:
            videos.append(json.loads(line))
    
    return videos


def download_thumbnail(video_url: str, output_path: str) -> bool:
    """Download the highest quality thumbnail for a video."""
    cmd = [
        "yt-dlp",
        "--write-thumbnail",
        "--skip-download",
        "--no-playlist",
        "-o", output_path,
        video_url,
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"  Error downloading thumbnail: {result.stderr.strip()}")
        return False
    
    return True


def find_downloaded_thumbnail(base_path: str) -> str | None:
    """Find the downloaded thumbnail file (yt-dlp may create various extensions)."""
    base = Path(base_path)
    parent = base.parent
    stem = base.stem
    
    # yt-dlp might create files with different patterns
    patterns = [
        f"{stem}.webp",
        f"{stem}.jpg.webp",
        f"{stem}.png.webp",
        f"{stem}.jpg",
        f"{stem}.png",
    ]
    
    for pattern in patterns:
        path = parent / pattern
        if path.exists():
            return str(path)
    
    return None


def convert_to_webp(input_path: str, output_path: str) -> bool:
    """Convert an image to WebP format using yt-dlp or ffmpeg."""
    # Try using ffmpeg directly
    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-c:v", "libwebp",
        "-q:v", "80",
        output_path,
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"  Error converting to WebP: {result.stderr.strip()}")
        return False
    
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Download thumbnails from a YouTube playlist and convert to WebP"
    )
    parser.add_argument(
        "playlist_url",
        help="URL of the YouTube playlist"
    )
    parser.add_argument(
        "-o", "--output-dir",
        default="./thumbnails",
        help="Output directory for thumbnails (default: ./thumbnails)"
    )
    parser.add_argument(
        "--quality",
        choices=["maxres", "sd", "high", "medium", "standard"],
        default="maxres",
        help="Thumbnail quality preference (default: maxres)"
    )
    
    args = parser.parse_args()
    
    # Check if yt-dlp is installed
    try:
        subprocess.run(["yt-dlp", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: yt-dlp is not installed. Install it with: pip install yt-dlp")
        sys.exit(1)
    
    # Check if ffmpeg is installed (needed for WebP conversion)
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: ffmpeg is not installed. Install it for WebP conversion.")
        sys.exit(1)
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Fetching playlist information...")
    try:
        videos = get_playlist_info(args.playlist_url)
    except subprocess.CalledProcessError as e:
        print(f"Error fetching playlist: {e.stderr}")
        sys.exit(1)
    
    if not videos:
        print("No videos found in playlist.")
        sys.exit(1)
    
    print(f"Found {len(videos)} videos in playlist.\n")
    
    success_count = 0
    failed_count = 0
    
    for idx, video in enumerate(videos, start=1):
        video_id = video.get("id", "")
        video_title = video.get("title", f"Video {idx}")
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        
        episode_name = f"episode{idx}-thumb"
        output_base = str(output_dir / episode_name)
        
        print(f"[{idx}/{len(videos)}] {video_title}")
        print(f"  Downloading thumbnail...")
        
        # Download thumbnail with yt-dlp
        if download_thumbnail(video_url, output_base):
            # Find the downloaded file
            downloaded_file = find_downloaded_thumbnail(output_base)
            
            if downloaded_file:
                # If not already webp, convert it
                if not downloaded_file.endswith(".webp"):
                    webp_path = f"{output_base}.webp"
                    print(f"  Converting to WebP...")
                    if convert_to_webp(downloaded_file, webp_path):
                        # Remove original file
                        try:
                            os.remove(downloaded_file)
                        except OSError:
                            pass
                        print(f"  Saved: {episode_name}.webp")
                        success_count += 1
                    else:
                        failed_count += 1
                else:
                    # Already webp, just rename if needed
                    expected_path = f"{output_base}.webp"
                    if downloaded_file != expected_path:
                        try:
                            os.rename(downloaded_file, expected_path)
                        except OSError:
                            pass
                    print(f"  Saved: {episode_name}.webp")
                    success_count += 1
            else:
                print(f"  Error: Could not find downloaded thumbnail")
                failed_count += 1
        else:
            failed_count += 1
        
        print()
    
    print(f"Download complete!")
    print(f"  Successful: {success_count}")
    print(f"  Failed: {failed_count}")
    print(f"  Output directory: {output_dir.absolute()}")


if __name__ == "__main__":
    main()
