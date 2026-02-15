# Architecture Diagrams - Usage Guide

## 📚 Files Created

### 1. **ARCHITECTURE.md** (Markdown with Mermaid)
- **Format:** Markdown with embedded Mermaid diagrams
- **Size:** Comprehensive documentation with 10 interactive diagrams
- **Best for:**
  - Reading on GitHub (auto-renders diagrams)
  - Viewing in Obsidian
  - VS Code with Mermaid extension
  - Any Markdown viewer with Mermaid support

### 2. **ARCHITECTURE.pdf** (High-Quality PDF)
- **Format:** PDF with rendered diagrams
- **Size:** 595KB
- **Best for:**
  - Printing
  - Presentations
  - Sharing with stakeholders
  - Offline reading
  - Professional documentation

## 🎨 Diagrams Included

The architecture documentation contains **10 detailed system diagrams**:

1. **High-Level Architecture** - Complete system overview with all layers
2. **Entry Point & CLI Flow** - Sequence diagram of startup and execution
3. **Component Hierarchy** - React component tree and relationships
4. **Agent Execution Flow** - Detailed agent loop with decision points
5. **State Management** - Hook-based state architecture
6. **Data Flow** - User input → Agent → Output sequence
7. **LLM Integration** - Multi-provider LLM system
8. **Tool System** - Tool registry and execution flow
9. **Storage & Persistence** - File system and data storage
10. **Event System** - Real-time event streaming architecture

## 📖 How to View

### View in GitHub
```bash
# Push to GitHub (diagrams render automatically)
git add ARCHITECTURE.md
git commit -m "Add architecture documentation"
git push origin main
```

Then view on GitHub - all Mermaid diagrams will render beautifully!

### View in VS Code
1. Install extension: [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)
2. Open `ARCHITECTURE.md`
3. Press `Cmd+Shift+V` (macOS) or `Ctrl+Shift+V` (Windows/Linux)
4. All diagrams render in preview

### View in Obsidian
1. Open `ARCHITECTURE.md` in Obsidian
2. Mermaid diagrams render automatically
3. Use graph view for navigation

### View PDF
```bash
# Open with default PDF viewer
open ARCHITECTURE.pdf

# Or drag to browser for viewing
```

## 🖼️ Export Individual Diagrams

### Extract as PNG (for presentations)

```bash
# Install mermaid-cli if not already installed
npm install -g @mermaid-js/mermaid-cli

# Extract specific diagram from markdown
# 1. Copy mermaid code block to file (e.g., diagram.mmd)
# 2. Render to PNG
mmdc -i diagram.mmd -o diagram.png -w 2000 -b transparent

# High resolution for printing
mmdc -i diagram.mmd -o diagram.png -w 4000 -s 2 -b transparent
```

### Extract as SVG (for editing)

```bash
mmdc -i diagram.mmd -o diagram.svg -b transparent
```

## 🔧 Customize Diagrams

All Mermaid diagrams in ARCHITECTURE.md can be edited:

1. **Edit in VS Code** - Modify the mermaid code blocks directly
2. **Live Preview** - Use [mermaid.live](https://mermaid.live) to edit and preview
3. **Export** - Download as PNG/SVG from mermaid.live
4. **Regenerate PDF** - Run the conversion again:
   ```bash
   ~/.claude/skills/markdown-to-pdf/scripts/convert.sh \
     ARCHITECTURE.md ARCHITECTURE.pdf \
     --render-mermaid --engine=xelatex --toc \
     --number-sections --variable=geometry:margin=1in
   ```

## 📊 Diagram Types Used

| Diagram | Type | Purpose |
|---------|------|---------|
| High-Level Architecture | Graph TB | System layers and connections |
| Entry Point Flow | Sequence | Startup and execution sequence |
| Component Hierarchy | Graph TD | React component tree |
| Agent Execution | Graph TB | Agent loop with decisions |
| State Management | Graph LR | Hook relationships |
| Data Flow | Sequence | Input to output sequence |
| LLM Integration | Graph TB | Provider factories |
| Tool System | Graph TB | Tool execution flow |
| Storage | Graph TB | Persistence layers |
| Event System | Sequence | Real-time events |

## 🎯 Key Features

### In Markdown (ARCHITECTURE.md)
- ✅ Interactive diagrams (click to zoom on GitHub)
- ✅ Searchable text
- ✅ Direct links to code files
- ✅ Syntax highlighting for code examples
- ✅ Easy to update and version control
- ✅ Renders in multiple tools

### In PDF (ARCHITECTURE.pdf)
- ✅ Professional formatting
- ✅ Table of contents with page numbers
- ✅ Rendered diagram images (9 out of 10 diagrams)
- ✅ Print-ready at 595KB
- ✅ Section numbering
- ✅ 1-inch margins, 11pt font

## ⚠️ Known Issues

### PDF Generation Warnings (Non-Critical)
1. **One diagram failed to render** (State Management diagram had a syntax issue)
   - All other 9 diagrams rendered successfully
   - The code is still visible in the PDF

2. **Unicode characters** (checkmarks ✅, emojis 🔄, box-drawing)
   - These are expected with LaTeX
   - Content is still readable
   - Use the markdown version for perfect rendering

3. **Some hyperlinks** may not work in PDF
   - Use markdown version for clickable links to code files

## 🚀 Quick Access

| Need | Use |
|------|-----|
| **Read online** | [ARCHITECTURE.md](ARCHITECTURE.md) on GitHub |
| **Edit diagrams** | [ARCHITECTURE.md](ARCHITECTURE.md) in VS Code |
| **Share externally** | [ARCHITECTURE.pdf](ARCHITECTURE.pdf) |
| **Print** | [ARCHITECTURE.pdf](ARCHITECTURE.pdf) |
| **Presentation** | Export individual diagrams to PNG |
| **Documentation** | Both files complement each other |

## 📝 Architecture Content

The documentation covers:

1. **System Overview** - Entry points, CLI structure, execution flow
2. **Component Details** - React/Ink components, hooks, state management
3. **Agent System** - Execution loop, tool integration, context management
4. **Services** - LLM providers, tool registry, storage
5. **Data Flow** - Complete user interaction lifecycle
6. **Patterns** - Architectural patterns and best practices
7. **Configuration** - Settings, environment, persistence
8. **Extension Guide** - How to add tools, providers, components

## 🔗 Related Documentation

- **Main README:** [README.md](README.md) - Project overview and setup
- **LLM Switching:** [SWITCHING_LLM_PROVIDERS.md](SWITCHING_LLM_PROVIDERS.md) - Provider configuration
- **Quick Reference:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Common tasks
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md) - This detailed guide
- **Architecture PDF:** [ARCHITECTURE.pdf](ARCHITECTURE.pdf) - Printable version

## 💡 Tips

### For Developers
- Use **ARCHITECTURE.md** in VS Code for editing with live preview
- Commit both .md and .pdf versions to git
- Update diagrams when making significant architectural changes

### For Stakeholders
- Share **ARCHITECTURE.pdf** for reviews and presentations
- Diagrams provide clear visual overview of system design
- Table of contents makes navigation easy

### For Documentation
- Link to **ARCHITECTURE.md** from other docs (renders diagrams on GitHub)
- Use individual diagram exports in slides/presentations
- Keep diagrams simple - details are in the text sections

---

**Generated:** 2026-02-14
**Version:** 2026.2.14
**Total Diagrams:** 10 (9 rendered in PDF, all visible in markdown)
**Documentation Pages:** 50+ pages in PDF
