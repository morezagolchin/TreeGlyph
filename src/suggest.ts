import { EditorSuggest } from "obsidian";
import type { App, Editor, EditorPosition, EditorSuggestContext, EditorSuggestTriggerInfo } from "obsidian";
import { collectNames, nameBeingTyped } from "./parser";

// A code fence, also inside a callout or quote. Group 1 is the language, empty on closing fences.
const FENCE = /^[\s>]*(?:`{3,}|~{3,})\s*([^\s`]*)/;

// Suggests names already used in the same TreeGlyph block while typing a name.
export class NameSuggest extends EditorSuggest<string> {
  private languages: string[];
  private names: string[] = [];

  constructor(app: App, languages: string[]) {
    super(app);
    this.languages = languages;
  }

  onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
    const block = this.blockAround(editor, cursor.line);
    if (!block) {
      return null;
    }

    const typed = nameBeingTyped(editor.getLine(cursor.line).slice(0, cursor.ch));
    if (!typed || !typed.name.trim()) {
      return null;
    }

    this.names = collectNames(block);
    return { start: { line: cursor.line, ch: typed.start }, end: cursor, query: typed.name };
  }

  getSuggestions(context: EditorSuggestContext): string[] {
    const query = context.query.toLowerCase();
    const prefixed: string[] = [];
    const containing: string[] = [];

    this.names.forEach((name) => {
      // The name being typed is in the block too; offering it back would only swallow Enter.
      if (name === context.query) {
        return;
      }
      const lower = name.toLowerCase();
      if (lower.startsWith(query)) {
        prefixed.push(name);
      } else if (lower.includes(query)) {
        containing.push(name);
      }
    });

    return [...prefixed, ...containing];
  }

  renderSuggestion(name: string, el: HTMLElement): void {
    el.setText(name);
  }

  selectSuggestion(name: string): void {
    if (!this.context) {
      return;
    }
    const { editor, start, end } = this.context;
    editor.replaceRange(name, start, end);
    editor.setCursor({ line: start.line, ch: start.ch + name.length });
  }

  // The text of the TreeGlyph block the line is in, or null when it isn't in one.
  private blockAround(editor: Editor, line: number): string | null {
    if (FENCE.test(editor.getLine(line))) {
      return null;
    }

    let open = line - 1;
    while (open >= 0 && !FENCE.test(editor.getLine(open))) {
      open -= 1;
    }
    // The nearest fence above must open a TreeGlyph block; closing fences have no language.
    const language = open >= 0 ? (FENCE.exec(editor.getLine(open)) as RegExpExecArray)[1] : "";
    if (!this.languages.includes(language.toLowerCase())) {
      return null;
    }

    let close = line + 1;
    while (close <= editor.lastLine() && !FENCE.test(editor.getLine(close))) {
      close += 1;
    }

    const lines: string[] = [];
    for (let index = open + 1; index < close; index += 1) {
      lines.push(editor.getLine(index).replace(/^[\s>]*/, ""));
    }
    return lines.join("\n");
  }
}
