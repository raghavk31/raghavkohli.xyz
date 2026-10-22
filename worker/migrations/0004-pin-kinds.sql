-- 2026-10-22: the homepage collage (pins.js). A pin is a note (the black post-it), an image (a png
-- placed as it is, transparency kept) or a line of text; style holds a text's {size, color, bold}
-- and {back} for anything set behind the page.
ALTER TABLE pins ADD COLUMN kind TEXT NOT NULL DEFAULT 'note';
ALTER TABLE pins ADD COLUMN style TEXT;
