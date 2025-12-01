# Publications Management

## Overview
Publications are now managed through `publications.json` as the single source of truth. The LaTeX file `publications.tex` is automatically generated from this JSON file.

## Structure

### publications.json
Contains all publication entries with the following fields:
- `year`: Publication year
- `title`: Publication title
- `authors`: Full author list
- `venue`: Conference/journal venue with location and date
- `url`: Link to paper (optional)

### generate_publications.py
Python script that generates `publications.tex` from `publications.json`. Publications are automatically categorized into:
- Conference Publications (conferences, symposiums, workshops)
- Journal Publications (journals, IEEE Software, Formal Methods in System Design)
- Book Chapters (Advances in Computers)

## Usage

### Adding a new publication
1. Edit `publications.json` and add your entry
2. Run: `python3 generate_publications.py`
3. Build the CV: `xelatex cv_schaef.tex`

### Updating publications
1. Edit the relevant entry in `publications.json`
2. Run: `python3 generate_publications.py`
3. Build the CV: `xelatex cv_schaef.tex`

## Benefits
- Single source of truth for publications
- Easy to export to website or other formats
- Consistent formatting
- Easier to maintain and update
