# Personal Website Summary

## Overview
Static personal academic website for Dr. Martin Schäf, hosted at www.martinschaef.de via GitHub Pages.

## Architecture

### Pages
- **index.html**: Homepage with bio, recent publications (last 2 years), education, misc info
- **pub.html**: Complete publications list organized by year

### Shared Components (Dynamically Loaded)
- **contact-info.html**: Contact section with name and social links (GitHub, LinkedIn, ORCID, Facebook, CV)
- **publications.json**: Single source of truth for all publications
  - index.html filters publications from last 2 years
  - pub.html displays all publications grouped by year

### Assets
- **images/**: Profile photos (me.png), social media icons, background images
- **stylesheets/**: CSS files (modern-style.css is main stylesheet)
- **papers/**: PDF files of published papers
- **cv/**: LaTeX CV source files

## Dynamic Content Loading
Both pages use JavaScript `fetch()` to load:
1. Contact info from `contact-info.html`
2. Publications from `publications.json`

**Important**: Must be served via HTTP (not file://) for fetch to work. Use `python3 -m http.server 8000` for local testing.

## Adding Publications
Add entries to `publications.json`:
```json
{
  "year": 2025,
  "title": "Paper Title",
  "authors": "Author List",
  "venue": "Conference/Journal Name",
  "url": "https://link-to-paper"
}
```

## CV Generation (Automated)
GitHub Actions workflow (`.github/workflows/compile_and_upload.yml`) automatically:
1. Runs `cv/generate_publications.py` to generate LaTeX publication list
2. Compiles `cv/cv_schaef.tex` using XeLaTeX
3. Uploads `cv_schaef.pdf` as GitHub release (tag: "resume")
4. CV accessible at: `https://github.com/martinschaef/martinschaef.github.io/releases/download/resume/cv_schaef.pdf`

## Design
- **Color scheme**: Blue-gray gradient background, white content card, blue accents (#3498db)
- **Layout**: Responsive single-column (max 900px width)
- **Profile**: Circular 150px image with blue border
- **Typography**: System fonts, clean and professional
- **Print-friendly**: Optimized styles for printing

## Professional Info
- **Current**: Principal Applied Scientist at AWS
- **Previous**: SRI International, UN University
- **Education**: PhD University of Freiburg (2011), MS Saarland University (2006)
- **Research**: Static analysis, software verification, fault localization, test automation
- **Publications**: 50+ papers in top conferences (ICSE, ASE, CAV, LPAR, etc.)
- **Notable**: Erdős number 3, ordained minister in NY
