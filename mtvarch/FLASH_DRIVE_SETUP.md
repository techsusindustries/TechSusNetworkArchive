# Media Library - Flash Drive Configuration

This guide explains how to configure your media library to access movies and TV shows stored on an external flash drive.

## Configuration

1. Update the `config.json` file with the path to your flash drive:

```json
{
  "flashDrivePath": "/path/to/your/flash/drive",
  "defaultAssetsPath": "./public/assets"
}
```

### Linux Example:
```json
{
  "flashDrivePath": "/media/user/FLASH_DRIVE",
  "defaultAssetsPath": "./public/assets"
}
```

### Windows Example:
```json
{
  "flashDrivePath": "D:\\Media",
  "defaultAssetsPath": "./public/assets"
}
```

### macOS Example:
```json
{
  "flashDrivePath": "/Volumes/MEDIA_DRIVE",
  "defaultAssetsPath": "./public/assets"
}
```

## Metadata Format

To reference files on your flash drive in `data/metadata.json`, use the `/flash-assets/` prefix:

```json
{
  "id": "my_movie",
  "type": "movie",
  "title": "My Movie",
  "description": "A great movie from my flash drive",
  "thumbnail": "/flash-assets/my_movie_poster.jpg",
  "videoUrl": "/flash-assets/my_movie.mp4",
  "duration": "2:15:30",
  "format": "flat",
  "year": 2024,
  "tags": ["movie", "flash-drive"]
}
```

For TV shows:

```json
{
  "id": "my_tv_show",
  "type": "tvshow",
  "title": "My TV Show",
  "description": "A great TV show from my flash drive",
  "thumbnail": "/flash-assets/my_tv_show_poster.jpg",
  "year": 2024,
  "tags": ["tvshow", "flash-drive"],
  "seasons": [
    {
      "seasonNumber": 1,
      "episodes": [
        {
          "episodeNumber": 1,
          "title": "Episode 1",
          "description": "The first episode",
          "thumbnail": "/flash-assets/season1_episode1_thumb.jpg",
          "videoUrl": "/flash-assets/season1_episode1.mp4",
          "duration": "0:45:00"
        }
      ]
    }
  ]
}
```

## Important Notes

- Make sure your flash drive is mounted at the specified path before starting the server
- Files referenced with the `/flash-assets/` prefix will be served from the configured flash drive path
- Files referenced with other paths (like `/assets/`) will continue to be served from the default location
- The server must have read permissions for the flash drive path
- After updating the configuration, restart the server for changes to take effect