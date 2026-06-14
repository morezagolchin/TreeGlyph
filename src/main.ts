import { Plugin } from "obsidian";
import { renderTreeGlyph } from "./renderer";

export default class TreeGlyphPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerMarkdownCodeBlockProcessor("treeglyph", (source, el) => {
      this.renderBlock(source, el);
    });

    this.registerMarkdownCodeBlockProcessor("tg", (source, el) => {
      this.renderBlock(source, el);
    });
  }

  private renderBlock(source: string, el: HTMLElement): void {
    el.empty();
    const wrapper = el.createDiv({ cls: "treeglyph-rendered" });
    const pre = wrapper.createEl("pre");

    try {
      pre.setText(renderTreeGlyph(source));
    } catch (error) {
      wrapper.addClass("treeglyph-error");
      pre.setText(error instanceof Error ? error.message : String(error));
    }
  }
}
