# Example of how to integrate the YouTube converter into your existing Flask app

from your_existing_app import app, login_required  # Your existing app setup
import os
import logging
import re
import threading
import time
import schedule
from flask import render_template, request, redirect, url_for, flash, jsonify, send_file, abort
import yt_dlp
from werkzeug.utils import secure_filename

# YouTube converter setup (add to your existing app)
download_progress = {}
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
    schedule.every(6).hours.do(cleanup_old_files)
    while True:
        schedule.run_pending()
        time.sleep(60)

# Start cleanup scheduler
cleanup_thread = threading.Thread(target=schedule_cleanup, daemon=True)
cleanup_thread.start()
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
        if '_percent_str' in d:
            percent = d['_percent_str'].strip('%')
            try:
                percent_float = float(percent)
                download_progress[video_id] = {
                    'status': 'downloading',
                    'percent': percent_float,
                    'speed': d.get('_speed_str', 'N/A'),
                    'eta': d.get('_eta_str', 'N/A')
                }
            except ValueError:
                pass
    elif d['status'] == 'finished':
        video_id = d.get('info_dict', {}).get('id', 'unknown')
        download_progress[video_id] = {
            'status': 'finished',
            'percent': 100,
            'filename': d['filename']
        }

def download_video(url, video_id):
    """Download video using yt-dlp"""
    try:
        download_progress[video_id] = {'status': 'starting', 'percent': 0}
        
        ydl_opts = {
            'format': 'mp4[height<=720]/best[height<=720]/best',
            'outtmpl': os.path.join(DOWNLOADS_DIR, '%(id)s-%(title).100s.%(ext)s'),
            'progress_hooks': [progress_hook],
            'noplaylist': True,
            'extractaudio': False,
            'audioformat': 'mp3',
            'ignoreerrors': True,
            'restrictfilenames': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                download_progress[video_id] = {'status': 'error', 'message': 'Failed to extract video information'}
                return
            
            download_progress[video_id].update({
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'Unknown')
            })
            
            ydl.download([url])
            
    except Exception as e:
        logging.error(f"Download error: {str(e)}")
        download_progress[video_id] = {'status': 'error', 'message': str(e)}

# Protected routes (add these to your existing app)
@app.route('/youtube-converter')
@login_required  # Your existing login decorator
def youtube_converter():
    """YouTube converter page - password protected"""
    return render_template('youtube_converter.html')

@app.route('/youtube-download', methods=['POST'])
@login_required  # Your existing login decorator
def youtube_download():
    """Handle download request - password protected"""
    url = request.form.get('url', '').strip()
    
    if not url:
        flash('Please enter a YouTube URL', 'error')
        return redirect(url_for('youtube_converter'))
    
    if not is_valid_youtube_url(url):
        flash('Please enter a valid YouTube URL', 'error')
        return redirect(url_for('youtube_converter'))
    
    video_id = extract_video_id(url)
    if not video_id:
        flash('Could not extract video ID from URL', 'error')
        return redirect(url_for('youtube_converter'))
    
    thread = threading.Thread(target=download_video, args=(url, video_id))
    thread.daemon = True
    thread.start()
    
    return redirect(url_for('youtube_download_status', video_id=video_id))

@app.route('/youtube-download/<video_id>')
@login_required  # Your existing login decorator
def youtube_download_status(video_id):
    """Show download status page - password protected"""
    return render_template('youtube_download.html', video_id=video_id)

@app.route('/api/youtube-progress/<video_id>')
@login_required  # Your existing login decorator
def youtube_get_progress(video_id):
    """API endpoint to get download progress - password protected"""
    progress = download_progress.get(video_id, {'status': 'not_found'})
    return jsonify(progress)

@app.route('/youtube-serve/<filename>')
@login_required  # Your existing login decorator
def youtube_serve_file(filename):
    """Serve downloaded file - password protected"""
    if os.path.exists(DOWNLOADS_DIR):
        for file in os.listdir(DOWNLOADS_DIR):
            if file.endswith('.mp4') and filename in file:
                filepath = os.path.join(DOWNLOADS_DIR, file)
                return send_file(filepath, as_attachment=True, download_name=f"{filename}.mp4")
    
    filename = secure_filename(filename)
    filepath = os.path.join(DOWNLOADS_DIR, filename)
    
    if not os.path.exists(filepath):
        abort(404)
    
    return send_file(filepath, as_attachment=True)