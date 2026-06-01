# Templates Folder

This directory stores reusable receipt templates and their visual/data configurations.

## Structure

- `index.json`: registry of available template config files.
- `defaults/`: built-in templates shipped with the app.

## Notes

- Current runtime still reads `defaultTemplates` from `app.js`.
- These files are the source of truth we will use for migration to file-based templates.
