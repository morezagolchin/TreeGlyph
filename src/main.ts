import { Plugin } from "obsidian";
import { renderTreeGlyph } from "./renderer";

const LANGUAGES = ["treeglyph", "tg"];

export default class TreeGlyphPlugin extends Plugin {
  async onload(): Promise<void> {
    LANGUAGES.forEach((language) => {
      this.registerMarkdownCodeBlockProcessor(language, (source, el) => {
        this.renderBlock(source, el);
      });
    });
  }

  private renderBlock(source: string, el: HTMLElement): void {
    el.empty();
    const wrapper = el.createDiv({ cls: "treeglyph-rendered" });

    try {
      renderTreeGlyph(source, wrapper);
    } catch (error) {
      wrapper.addClass("treeglyph-error");
      wrapper.createEl("pre", { text: error instanceof Error ? error.message : String(error) });
    }
  }
}
