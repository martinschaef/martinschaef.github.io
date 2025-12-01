#!/usr/bin/env python3
import json

with open('../publications.json') as f:
    pubs = json.load(f)

conf = [p for p in pubs if 'Conference' in p['venue'] or 'Symposium' in p['venue'] or 'Workshop' in p['venue']]
journal = [p for p in pubs if 'Journal' in p['venue'] or 'IEEE Software' in p['venue'] or 'Formal Methods in System Design' in p['venue']]
book = [p for p in pubs if 'Advances in Computers' in p['venue']]

with open('publications.tex', 'w') as f:
    f.write('\\section{\\sc Conference Publications}\n\n')
    f.write('\\newcounter{saveenum}\n\n')
    f.write('\\begin{enumerate}\n\n')
    
    for p in conf:
        f.write(f"  \\item \\textbf{{{p['title']}}}.\n")
        f.write(f"  \\\\  {p['authors']}\n")
        f.write(f"  \\emph{{{p['venue']}}}\n\n")
    
    f.write('  \\setcounter{saveenum}{\\value{enumi}}\n')
    f.write('\\end{enumerate}\n\n\n\n')
    
    f.write('\\section{\\sc Journal Publications}\n\n')
    f.write('\\begin{enumerate} \\setcounter{enumi}{\\value{saveenum}}\n\n')
    
    for p in journal:
        f.write(f"\\item \\textbf{{{p['title']}}}.\n")
        f.write(f"\\\\ {p['authors']}\n")
        f.write(f"\\emph{{{p['venue']}}}\n\n")
    
    f.write('\\setcounter{saveenum}{\\value{enumi}}\n')
    f.write('\\end{enumerate}\n\n\n')
    
    f.write('\\section{\\sc Book Chapters}\n\n')
    f.write('\\begin{enumerate} \\setcounter{enumi}{\\value{saveenum}}\n\n')
    
    for p in book:
        f.write(f"  \\item \\textbf{{{p['title']}}}. {p['authors']} in \\emph{{{p['venue']}}}\n")
    
    f.write('  \n \\setcounter{saveenum}{\\value{enumi}} \n')
    f.write('\\end{enumerate}\n\n')
    f.write('\\iffalse\n')
    f.write('\\section{\\sc Drafts and Technical Reports}\n\n')
    f.write('\\begin{enumerate}\\setcounter{enumi}{\\value{saveenum}}\n')
    f.write(' \\setcounter{saveenum}{\\value{enumi}} \n')
    f.write('\\end{enumerate}\n')
    f.write('\\fi\n')
