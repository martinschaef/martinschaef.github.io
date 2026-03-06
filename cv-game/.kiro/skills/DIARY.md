# Skill: Development Diary

## Purpose
Maintain a running log of all development interactions in `./diary.md` to document how the game was built with Kiro.

## Rules
After completing each user request, append an entry to `./diary.md` with the following format:

```
## <DATE> — <SHORT TITLE>

**Prompt:** <One-line summary of what the user asked for>

**What changed:**
- <Bullet list of files modified/created and what was done>

**Key decisions:** <Any notable design choices made, or "None" if straightforward>

---
```

- Use the current date/time for each entry
- Keep summaries concise — one line for the prompt, short bullets for changes
- If multiple back-and-forth messages contribute to one logical task, combine them into a single entry
- Create the file with a title header if it doesn't exist yet:
  ```
  # Career Quest — Development Diary
  Built with [Kiro](https://kiro.dev)

  ---
  ```
- Append new entries at the bottom of the file
- Do NOT log trivial questions that don't result in code/file changes
