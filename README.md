# Source
This is my (Wenjie Feng's) personal website, forked from **Academic Pages**, which is a GitHub Pages template for personal and professional portfolio-oriented websites.

# Getting Started

1. If want to exclude example pages from showing, add its file name to the `_config.yml` under `exclude`. 
2. I have commented out the share buttons by commenting:
```
<!-- {% if page.share %}{% include social-share.html %}{% endif %} -->
``` 
in `_layouts\single.html` and `_layouts\talk.html`. 
3. Linking the **CV** button to directly download my cv pdf file by changing the url of CV in `_data/navigation.yml` from `/cv/` to `/files/cv.pdf` and exclude `_pages/cv.md`, `_pages/cv-json.md` and `_data/cv.json`. 
4. All input .md files should be in the format of `YYYY-MM-DD-XXX.md`
5. If want to write something but not pulishing it: write `drafts: true`
6. `Project` .md should be put under `\_portfolio` folder

See more info at https://academicpages.github.io/