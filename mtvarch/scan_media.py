#!/usr/bin/env python3

import os
import json
import re
from pathlib import Path

def extract_title_and_year_from_filename(filename):
    """Extract title and year from filename using common patterns"""
    # Remove file extension
    name = os.path.splitext(filename)[0]
    
    # Common patterns for movies: title-year or title_year
    patterns = [
        r'(.+?)[\s._-](\d{4})',  # title-year or title_year
        r'(.+?)\s*\(\s*(\d{4})\s*\)',  # title (year)
    ]
    
    for pattern in patterns:
        match = re.search(pattern, name)
        if match:
            title = clean_title(match.group(1).strip())
            year = int(match.group(2))
            return title, year
    
    # If no year found, just return the cleaned title
    title = clean_title(name)
    return title, None

def clean_title(title):
    """Clean up titles by handling common naming patterns"""
    # Handle episode files like 'episode1', 'episode2', etc.
    if re.match(r'^episode\d+$', title, re.IGNORECASE):
        # Extract episode number and format as "Episode X"
        ep_num = re.search(r'\d+', title).group()
        return f"Episode {ep_num}"
    
    # Handle movie titles with hyphens and numbers
    # Convert common abbreviations and patterns
    title = re.sub(r'-vol(\d+)', r' Vol \1', title, flags=re.IGNORECASE)
    title = re.sub(r'-part(\d+)', r' Part \1', title, flags=re.IGNORECASE)
    title = re.sub(r'-(\d+)(st|nd|rd|th)', r' \1\2', title, flags=re.IGNORECASE)
    
    # Replace hyphens and underscores with spaces
    title = title.replace('-', ' ').replace('_', ' ')
    
    # Handle special cases like Roman numerals after certain keywords
    title = re.sub(r'(ironman|spiderman|thor|starwars)\s+(\d+)', r'\1 \2', title, flags=re.IGNORECASE)
    title = re.sub(r'(avengers|gotg)\s+([a-z])', lambda m: m.group(1) + ' ' + m.group(2).upper(), title, flags=re.IGNORECASE)
    
    # Capitalize properly (but preserve acronyms like MCU, DC, etc.)
    words = title.split()
    result = []
    for word in words:
        # Preserve common acronyms
        if word.upper() in ['MCU', 'DC', 'MARVEL', 'STARWARS', 'X-MEN', 'X2', 'X3']:
            result.append(word.upper())
        elif word.lower() in ['the', 'and', 'or', 'but', 'nor', 'for', 'so', 'yet', 'a', 'an', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'is', 'it']:
            # These words are lowercased unless they're the first or last word
            if result:  # Not the first word
                result.append(word.lower())
            else:  # First word, capitalize
                result.append(word.capitalize())
        else:
            result.append(word.capitalize())
    
    # Join and handle special formatting
    final_title = ' '.join(result)
    
    # Fix specific patterns like "E1", "E2" for episodes
    final_title = re.sub(r'\bE(\d+)\b', r'Episode \1', final_title)
    
    return final_title

def scan_movies(movies_dir):
    """Scan movies directory and return metadata"""
    movies = []
    
    for root, dirs, files in os.walk(movies_dir):
        # Skip HTML and other non-media files
        media_files = [f for f in files if f.lower().endswith(('.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'))]
        
        for file in media_files:
            filepath = os.path.join(root, file)
            rel_path = os.path.relpath(filepath, movies_dir)
            
            # Extract title and year from filename
            title, year = extract_title_and_year_from_filename(file)
            
            # Create movie entry
            movie_id = f"movie_{os.path.basename(filepath).replace('.', '_').replace(' ', '_')}"
            
            movie_entry = {
                "id": movie_id,
                "type": "movie",
                "title": title,
                "description": f"A movie from your collection: {title}",
                "thumbnail": f"/flash-assets/{os.path.splitext(file)[0]}.jpg",  # Placeholder
                "videoUrl": f"/flash-assets/{rel_path}",
                "duration": "N/A",  # Duration would need to be calculated separately
                "year": year if year else 2024,  # Default to 2024 if no year found
                "tags": ["movie", "flash-drive"]
            }
            movies.append(movie_entry)
    
    return movies

def scan_tv_shows(tvshows_dir):
    """Scan TV shows directory and return metadata"""
    shows = []
    
    # Get all show directories
    for show_dir in os.listdir(tvshows_dir):
        show_path = os.path.join(tvshows_dir, show_dir)
        
        if not os.path.isdir(show_path):
            continue
            
        # Look for season directories (s1, s2, etc.)
        seasons = {}
        for season_dir in os.listdir(show_path):
            season_path = os.path.join(show_path, season_dir)
            
            if not os.path.isdir(season_path) or not season_dir.startswith('s'):
                continue
                
            # Extract season number
            try:
                season_num = int(re.search(r'\d+', season_dir).group())
            except:
                continue
                
            # Scan episodes in this season
            episodes = []
            for episode_file in os.listdir(season_path):
                if episode_file.lower().endswith(('.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm')):
                    # Try to extract episode number from filename
                    ep_match = re.search(r'e?(\d+)', episode_file, re.IGNORECASE)
                    if ep_match:
                        episode_num = int(ep_match.group(1))
                    else:
                        # If no episode number in filename, use position in sorted list
                        episode_num = len(episodes) + 1
                    
                    episode_title, _ = extract_title_and_year_from_filename(episode_file)
                    
                    episode_entry = {
                        "episodeNumber": episode_num,
                        "title": episode_title,
                        "description": f"Episode {episode_num} of {show_dir.title()}",
                        "thumbnail": f"/flash-assets/{os.path.splitext(episode_file)[0]}.jpg",  # Placeholder
                        "videoUrl": f"/flash-assets/{os.path.relpath(os.path.join(season_path, episode_file), tvshows_dir)}",
                        "duration": "N/A"  # Duration would need to be calculated separately
                    }
                    episodes.append(episode_entry)
            
            # Sort episodes by number
            episodes.sort(key=lambda x: x['episodeNumber'])
            
            if episodes:  # Only add season if it has episodes
                seasons[season_num] = {
                    "seasonNumber": season_num,
                    "episodes": episodes
                }
        
        if seasons:  # Only add show if it has seasons
            # Create TV show entry
            show_entry = {
                "id": f"tvshow_{show_dir}",
                "type": "tvshow",
                "title": show_dir.replace('-', ' ').replace('_', ' ').title(),
                "description": f"A TV show from your collection: {show_dir.title()}",
                "thumbnail": f"/flash-assets/{show_dir}_thumb.jpg",  # Placeholder
                "year": 2024,  # Default year
                "tags": ["tvshow", "flash-drive"],
                "seasons": list(seasons.values())
            }
            # Sort seasons by number
            show_entry["seasons"].sort(key=lambda x: x['seasonNumber'])
            shows.append(show_entry)
    
    return shows

def main():
    # Define paths
    flash_drive_path = "/mnt/f"
    movies_dir = os.path.join(flash_drive_path, "movies")
    tvshows_dir = os.path.join(flash_drive_path, "tvshows")
    
    # Load existing metadata
    with open('/home/techsusadmin/projects/techsus/mtvarch/data/metadata.json', 'r') as f:
        metadata = json.load(f)
    
    # Clear existing library entries (keeping config)
    new_library = []
    
    # Add back the config section
    config = metadata.get('config', {
        "siteTitle": "Media Library",
        "categories": [
            {"id": "movies", "title": "Movies", "filterTag": "movie"},
            {"id": "tvshows", "title": "TV Shows", "filterTag": "tvshow"},
            {"id": "featured", "title": "Featured", "filterTag": "featured"}
        ]
    })
    
    # Scan movies
    if os.path.exists(movies_dir):
        print("Scanning movies...")
        movies = scan_movies(movies_dir)
        new_library.extend(movies)
        print(f"Found {len(movies)} movies")
    
    # Scan TV shows
    if os.path.exists(tvshows_dir):
        print("Scanning TV shows...")
        tv_shows = scan_tv_shows(tvshows_dir)
        new_library.extend(tv_shows)
        print(f"Found {len(tv_shows)} TV shows")
    
    # Create new metadata structure
    new_metadata = {
        "config": config,
        "library": new_library
    }
    
    # Write updated metadata
    with open('/home/techsusadmin/projects/techsus/mtvarch/data/metadata.json', 'w') as f:
        json.dump(new_metadata, f, indent=2)
    
    print("Metadata updated successfully!")

if __name__ == "__main__":
    main()