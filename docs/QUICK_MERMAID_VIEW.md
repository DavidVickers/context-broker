# Quick Guide: Viewing Mermaid Diagrams in Cursor

## 🚨 Problem: Extensions Installed But Commands Not Showing

The extensions are installed (`bierner.markdown-mermaid` and `shd101wyy.markdown-preview-enhanced`), but Cursor might not be recognizing them.

## ✅ Solution 1: Use GitHub (EASIEST - Guaranteed to Work)

**Open this URL in your browser:**

```
https://github.com/DavidVickers/context-broker/blob/main/docs/ARCHITECTURE_COMPLETE.md
```

**This will:**
- ✅ Render all Mermaid diagrams automatically
- ✅ Work immediately (no setup needed)
- ✅ Look professional
- ✅ Can bookmark it for easy access

**This is the recommended solution** - GitHub has native Mermaid support built-in!

---

## ✅ Solution 2: Use Built-in VS Code Markdown Preview

Even if the extensions aren't working, Cursor has a built-in markdown preview:

1. **Open** `docs/ARCHITECTURE_COMPLETE.md` in Cursor

2. **Press**:
   - Mac: `Cmd+Shift+V`
   - Windows/Linux: `Ctrl+Shift+V`

3. **Or**:
   - Mac: `Cmd+K V` (press Cmd+K, then V)
   - Windows/Linux: `Ctrl+K V`

4. **Check if it works:**
   - The built-in preview might show Mermaid diagrams
   - If not, it will at least show the markdown

---

## ✅ Solution 3: Check Extension Status in Cursor

1. **Open Extensions Panel:**
   - Click the Extensions icon in the left sidebar (looks like 4 squares)
   - Or press: `Cmd+Shift+X` (Mac) / `Ctrl+Shift+X` (Windows)

2. **Search for:** `markdown`

3. **Look for:**
   - `Markdown Preview Enhanced` by Yiyi Wang
   - `Markdown Preview Mermaid Support` by Matt Bierner

4. **Check if they show as:**
   - ✅ "Enabled" (should work)
   - ⚠️ "Disabled" (click Enable)
   - ❌ Not installed (reinstall)

5. **If disabled or not installed:**
   - Click "Enable" or "Install"
   - Restart Cursor
   - Try the preview again

---

## ✅ Solution 4: Try Right-Click Context Menu

1. **Open** `docs/ARCHITECTURE_COMPLETE.md`

2. **Right-click** anywhere in the editor

3. **Look for menu options:**
   - "Open Preview" or "Open Preview to the Side"
   - "Markdown Preview Enhanced"
   - Any preview-related options

4. **Click one** and see if it opens a preview

---

## ✅ Solution 5: Use Command Palette Search

1. **Press:** `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)

2. **Type:** `preview` (without quotes)

3. **Look for:**
   - "Markdown: Open Preview"
   - "Markdown: Open Preview to the Side"
   - Any preview commands

4. **Select one** and see if it works

---

## ✅ Solution 6: Create VS Code Settings File

Create a settings file to force enable Mermaid:

1. **Create folder:** `.vscode` in your project root (if it doesn't exist)

2. **Create file:** `.vscode/settings.json`

3. **Add this content:**
   ```json
   {
     "markdown.mermaid.enabled": true,
     "markdown-preview-enhanced.enableMermaid": true,
     "markdown-preview-enhanced.enableScriptExecution": true
   }
   ```

4. **Save the file**

5. **Restart Cursor**

6. **Try the preview again**

---

## 🔍 Why This Might Be Happening

- **Cursor is a fork of VS Code** - it might handle extensions differently
- **The `code` command might be Cursor** - extensions installed via command line might not sync
- **Extensions need to be enabled** - they might be installed but not activated
- **Cursor might need a restart** - after installing extensions

---

## 🎯 Recommended Approach

**For viewing diagrams:**
- ✅ **Use GitHub** - it's the most reliable option
  - Open: https://github.com/DavidVickers/context-broker/blob/main/docs/ARCHITECTURE_COMPLETE.md
  - All diagrams render automatically
  - No setup needed

**For editing:**
- ✅ **Edit in Cursor** (text editing works fine)
- ✅ **View on GitHub** in a browser tab alongside Cursor
- ✅ **Refresh GitHub** after saving changes to see updated diagrams

**This gives you:**
- ✅ Best editing experience (Cursor)
- ✅ Best viewing experience (GitHub)
- ✅ No extension issues
- ✅ Works 100% of the time

---

## 📝 Quick Reference

**GitHub URL (Bookmark This!):**
```
https://github.com/DavidVickers/context-broker/blob/main/docs/ARCHITECTURE_COMPLETE.md
```

**Built-in Preview Commands:**
- Mac: `Cmd+Shift+V` or `Cmd+K V`
- Windows: `Ctrl+Shift+V` or `Ctrl+K V`

**Check Extensions:**
- Mac: `Cmd+Shift+X`
- Windows: `Ctrl+Shift+X`
- Then search: `markdown`

---

## ✨ Bottom Line

**If extensions aren't working in Cursor:**
1. **Just use GitHub** - it's easier and more reliable! 🎉
2. Edit in Cursor, view on GitHub
3. This is actually the best workflow anyway

