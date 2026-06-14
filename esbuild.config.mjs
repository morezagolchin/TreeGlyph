import builtins from "builtin-modules";
import esbuild from "esbuild";
import process from "process";

const production = process.argv[2] === "production";

const context = await esbuild.context({
  banner: {
    js: "/* TreeGlyph Obsidian plugin */",
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  logLevel: "info",
  minify: production,
  outfile: "main.js",
  sourcemap: production ? false : "inline",
  target: "es2018",
  treeShaking: true,
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
