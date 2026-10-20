# TreeGlyph

TreeGlyph is an Obsidian plugin that turns a simple, human-readable hierarchy syntax into cladogram-style tree maps.

Write a `treeglyph` code block in a note, and TreeGlyph replaces it with the rendered map in reading view and Live Preview. Branches run left to right with elbow connectors, and each lineage below a tree's first split gets its own colour. Wide maps scroll horizontally. Hover over any name to see its full path from the root in a tooltip.

````markdown
```treeglyph
Root/Branch/Leaf
Branch/Leaf A,Leaf B
```
````

## Instructions

Write one hierarchy per line. Use `/` to separate levels:

```txt
Root/Branch/Leaf
```

Use `,` when one level has multiple names:

```txt
Root/Branch A,Branch B,Branch C
```

Reuse an existing name at the start of a later line to continue that part of the same tree:

```txt
Root/Branch
Branch/Leaf A,Leaf B
```

Add `*` after a name to show it as a small rotated label, like the root of a cladogram:

```txt
Eukaryota*/Chromalveolatae,Excavatae,Primoplantae
```

Use either `treeglyph` or the shorter `tg` as the code block language:

````markdown
```tg
Root/Branch/Leaf
```
````

## Development

Install dependencies:

```bash
npm install
```

Build `main.js` (type-checks first):

```bash
npm run build
```

For a watch build while developing:

```bash
npm run dev
```

`main.js` is build output and is not committed. To try the plugin, create the folder below in a vault and copy or symlink `main.js`, `manifest.json`, and `styles.css` into it, then enable **TreeGlyph** in Obsidian's Community plugins settings:

```txt
YourVault/.obsidian/plugins/treeglyph
```

## Releasing

1. Run `npm version patch` (or `minor` / `major`). This updates `package.json`, `manifest.json`, and `versions.json` together and creates a git tag.
2. Push the commit and tag.
3. Create a GitHub release whose tag is the bare version (for example `0.1.1`, no `v`) and attach `main.js`, `manifest.json`, and `styles.css`.

## Example

```treeglyph
Metazoa*/Eumetazoa*/Bilateria*/Protostomia,Deuterostomia,Incertae sedis (of uncertain placement)

Protostomia/Ecdysozoa,Clylon-euralia,Spiralia

Ecdysozoa/Panarthropoda/Arthropoda,Tradigara,Onychophora

Deuterostomia/Chordata/Echinodermata/Hemichordata

Chordata/Craniota,Acrania,Tunicata

Arthropoda/Chelicerata,Myrapoda,Crustacea,Hexapoda
```

This renders `Metazoa`, `Eumetazoa`, and `Bilateria` as rotated labels on a neutral trunk. At `Bilateria` the tree splits, and `Protostomia`, `Deuterostomia`, and `Incertae sedis` each get their own colour, which their descendants keep. Inner nodes sit on their branch above an open junction; leaves end in a filled dot.
