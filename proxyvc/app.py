import os
import logging
import re
import threading
import time
import schedule
from urllib.parse import urlparse
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file, abort
import yt_dlp
from werkzeug.utils import secure_filename

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "your-secret-key-here")

# Global dictionary to store download progress
download_progress = {}
progress_lock = threading.Lock()

# Ensure downloads directory exists
DOWNLOADS_DIR = 'downloads'
if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR)

def cleanup_old_files():
    """Clean up downloaded files automatically"""
    try:
        if os.path.exists(DOWNLOADS_DIR):
            for filename in os.listdir(DOWNLOADS_DIR):
                if filename == '.gitkeep':
                    continue
                filepath = os.path.join(DOWNLOADS_DIR, filename)
                if os.path.isfile(filepath):
                    os.remove(filepath)
        logging.info("Automatic cleanup completed")
    except Exception as e:
        logging.error(f"Error during automatic cleanup: {str(e)}")

def schedule_cleanup():
    """Schedule periodic cleanup"""
    schedule.every(35).minutes.do(cleanup_old_files)

    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

# Start cleanup scheduler in background thread
cleanup_thread = threading.Thread(target=schedule_cleanup, daemon=True)
cleanup_thread.start()

# Run initial cleanup on server start
cleanup_old_files()

def is_valid_youtube_url(url):
    """Validate if the URL is a valid YouTube URL"""
    youtube_regex = re.compile(
        r'(https?://)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)/'
        r'(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
    )
    return youtube_regex.match(url) is not None

def extract_video_id(url):
    """Extract video ID from YouTube URL"""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'(?:v\/)([0-9A-Za-z_-]{11})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def progress_hook(d):
    """Hook function to track download progress"""
    if d['status'] == 'downloading':
        video_id = d.get('info_dict', {}).get('id', 'unknown')
        total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
        downloaded = d.get('downloaded_bytes', 0)
        speed = d.get('speed', 0)
        eta = d.get('eta', 0)

        percent = 0
        if total > 0:
            percent = (downloaded / total) * 100
        elif '_percent_str' in d:
            try:
                percent = float(d['_percent_str'].strip('%'))
            except (ValueError, AttributeError):
                percent = 0

        with progress_lock:
            download_progress[video_id] = {
                'status': 'downloading',
                'percent': percent,
                'speed': f"{format_size(speed)}/s" if speed else 'N/A',
                'eta': format_eta(eta) if eta else 'N/A'
            }
    elif d['status'] == 'finished':
        video_id = d.get('info_dict', {}).get('id', 'unknown')
        with progress_lock:
            download_progress[video_id] = {
                'status': 'finished',
                'percent': 100,
                'filename': d.get('filename', '')
            }


def format_size(bytes_val):
    """Format bytes to human readable size"""
    if not bytes_val:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if abs(bytes_val) < 1024.0:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.1f} TB"


def format_eta(seconds):
    """Format ETA to human readable string"""
    if not seconds:
        return "N/A"
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes}:{secs:02d}"

def download_video(url, video_id):
    """Download video using yt-dlp"""
    try:
        # Set initial progress
        with progress_lock:
            download_progress[video_id] = {
                'status': 'starting',
                'percent': 0
            }

        ydl_opts = {
            'format': 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[height<=720]/best',
            'outtmpl': os.path.join(DOWNLOADS_DIR, '%(id)s-%(title).100s.%(ext)s'),
            'progress_hooks': [progress_hook],
            'noplaylist': True,
            'extractaudio': False,
            'ignoreerrors': False,
            'restrictfilenames': True,
            # Client extraction settings to avoid blocking
            'extractor_args': {
                'youtube': {
                    'client': ['ios', 'android', 'web'],
                    'player_client': ['ios', 'android', 'web']
                }
            },
            # Use cookies if available
            'cookiefile': None,
            # Better retry handling
            'retries': 3,
            'fragment_retries': 3,
            # Skip unavailable formats
            'skip_unavailable_formats': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info first
            try:
                info = ydl.extract_info(url, download=False)
            except Exception as extract_error:
                logging.error(f"Info extraction error: {str(extract_error)}")
                with progress_lock:
                    download_progress[video_id] = {
                        'status': 'error',
                        'message': f'Failed to extract video information: {str(extract_error)}'
                    }
                return

            if not info:
                with progress_lock:
                    download_progress[video_id] = {
                        'status': 'error',
                        'message': 'Failed to extract video information'
                    }
                return

            # Update progress with video info
            with progress_lock:
                download_progress[video_id].update({
                    'title': info.get('title', 'Unknown'),
                    'duration': info.get('duration', 0),
                    'uploader': info.get('uploader', 'Unknown')
                })

            # Start download
            ydl.download([url])

    except Exception as e:
        logging.error(f"Download error: {str(e)}")
        with progress_lock:
            download_progress[video_id] = {
                'status': 'error',
                'message': str(e)
            }

@app.route('/')
def index():
    """Main page with URL input form"""
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
    """Handle download request"""
    url = request.form.get('url', '').strip()
    
    if not url:
        flash('Please enter a YouTube URL', 'error')
        return redirect(url_for('index'))
    
    if not is_valid_youtube_url(url):
        flash('Please enter a valid YouTube URL', 'error')
        return redirect(url_for('index'))
    
    video_id = extract_video_id(url)
    if not video_id:
        flash('Could not extract video ID from URL', 'error')
        return redirect(url_for('index'))
    
    # Start download in background thread
    thread = threading.Thread(target=download_video, args=(url, video_id))
    thread.daemon = True
    thread.start()
    
    return redirect(url_for('download_status', video_id=video_id))

@app.route('/download/<video_id>')
def download_status(video_id):
    """Show download status page"""
    return render_template('download.html', video_id=video_id)

@app.route('/api/progress/<video_id>')
def get_progress(video_id):
    """API endpoint to get download progress"""
    progress = download_progress.get(video_id, {'status': 'not_found'})
    return jsonify(progress)


@app.route('/serve/<video_id>')
def serve_file(video_id):
    """Serve downloaded file"""
    # Get the filename from download progress
    with progress_lock:
        progress = download_progress.get(video_id, {})
    filename = progress.get('filename', '')

    # If we have the filename from progress, use it
    if filename and os.path.exists(filename):
        return send_file(
            filename,
            as_attachment=True,
            download_name=f"{video_id}.mp4"
        )

    # Otherwise, search for the file in downloads directory
    if os.path.exists(DOWNLOADS_DIR):
        for file in os.listdir(DOWNLOADS_DIR):
            if file.endswith('.mp4') and file.startswith(video_id):
                filepath = os.path.join(DOWNLOADS_DIR, file)
                return send_file(
                    filepath,
                    as_attachment=True,
                    download_name=f"{video_id}.mp4"
                )

    abort(404)


@app.route('/api/cleanup-progress/<video_id>', methods=['POST'])
def cleanup_progress(video_id):
    """Clean up progress entry after download is complete"""
    with progress_lock:
        if video_id in download_progress:
            del download_progress[video_id]
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
