# Personal Website - martinschaef.github.io

Static personal academic website hosted on GitHub Pages at www.martinschaef.de

## Structure

### Main Pages
- **index.html** - Homepage with bio, recent publications (last 2 years), education, and misc info
- **pub.html** - Complete publications list organized by year

### Shared Components
- **contact-info.html** - Contact section with name, social links (GitHub, LinkedIn, ORCID, Facebook, CV)
- **publications.json** - Single source of truth for all publications data

### Assets
- **images/** - Profile photos, social media icons, background images
- **stylesheets/** - CSS files (modern-style.css is the main stylesheet)
- **papers/** - PDF files of published papers
- **cv/** - LaTeX CV source files

## Dynamic Content Loading

Both pages use JavaScript to dynamically load:
1. **Contact info** from `contact-info.html`
2. **Publications** from `publications.json`
   - index.html filters to show only last 2 years
   - pub.html shows all publications grouped by year

### Adding a New Publication

Simply add an entry to `publications.json`:
```json
{
  "year": 2025,
  "title": "Paper Title",
  "authors": "Author List",
  "venue": "Conference/Journal Name",
  "url": "https://link-to-paper"
}
```

The publication will automatically appear on both pages.

## CV Generation

The CV PDF is automatically built by GitHub Actions on every push:

1. **Workflow**: `.github/workflows/compile_and_upload.yml`
2. **Process**:
   - Runs `cv/generate_publications.py` to generate LaTeX publication list
   - Compiles `cv/cv_schaef.tex` using XeLaTeX
   - Uploads `cv_schaef.pdf` as a GitHub release (tag: "resume")
3. **Access**: CV is linked from the website via GitHub releases

## Local Development

Serve locally to test (required for JavaScript fetch to work):
```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Design

- Clean, professional blue-gray color scheme
- Responsive single-column layout (max 900px)
- Circular profile picture with blue border
- Gradient background with white content card
- Print-friendly styles
