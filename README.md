# Image Zipper

A small web application to download multiple images as a ZIP file.  
Supports progress bar, ETA, light/dark mode, and cancel.

---

## Features

- Input list of images (`filename.jpg;https://url/to/image.jpg`)  
- Download all images and zip them automatically  
- Progress bar with ETA  
- Cancel ongoing jobs  
- Light/dark mode with system preference and toggle  
- Spinner animation during ZIP creation  
- Version & PR display (`vX.Y.Z` or `vX.Y.Z (PR #123)`)

---

## Usage

1. **Clone the repo**:

```bash
git clone https://github.com/mrdavidkovacs/image-zipper.git
cd image-zipper

2. **Run with Docker Compose**:
docker-compose up -d
