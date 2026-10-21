# TreeGlyph

TreeGlyph is an Obsidian plugin that turns a simple, human-readable hierarchy syntax into cladogram-style tree maps.

Write a `treeglyph` code block in a note, and TreeGlyph replaces it with the rendered map in reading view and Live Preview. Branches run left to right with elbow connectors, and each lineage below a tree's first split gets its own colour. Wide maps scroll horizontally, and names can carry a tooltip that shows on hover.

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

Add `.` and a level after a name to show its taxonomic level in grey in front of it. `Bacillariophyceae.kl` is shown as **kl.** Bacillariophyceae. The level is written exactly as you type it, so any abbreviation works (`kl`, `o`, `fam`, `Ordnung`, …). It can also be given on a later line where the name is reused, and it combines with `*` (`Eukaryota.domain*`):

```txt
Heterokontophyten/Bacillariophyceae.kl,Phaeophyceae.kl
Florideophyceae.kl/Ceramiales.o,Nemalionales.o
```

Only the text after the last `.` counts as the level, and only if it has no spaces, so names like `St. Helena` stay as they are.

Add a second or alternative name in double parentheses right after a name. It is shown after the name in grey italics, and it may contain spaces, dots, commas, and slashes. Like the level, it can be given on a later line and combines with `.level` and `*`:

```txt
Heterokontobionta/Dinophyten((dinoflagellates)),Heterokontophyten
Heterokontophyten/Bacillariophyceae((diatoms)).kl,Phaeophyceae((brown algae)).kl
```

Single parentheses stay part of the name, as in `Incertae sedis (of uncertain placement)`.

Add `:` and a text in double quotes after a name to give it a tooltip, shown when you hover over the name. Names without one show no tooltip. The text may contain anything except `""`. Single quotes are not tooltips, so `Name:"text"` stays part of the name:

```txt
Heterokontophyten/Bacillariophyceae.kl:""Single-celled algae in glass shells"",Phaeophyceae.kl
```

You can also write tooltips on their own lines, outside the tree, before or after it. A line with only names that each have a tooltip sets those tooltips and adds nothing to the tree:

```txt
Eukaryota/Chromalveolatae,Excavatae
Excavatae:""Single-celled, mostly flagellated eukaryotes""
Chromalveolatae:""Algae and protists with red-algal plastids"",Eukaryota:""Organisms whose cells have a nucleus""
```

A tooltip may run over several lines. Everything from the opening `""` to the closing `""` belongs to it, and its line breaks count as spaces, so a long text can be wrapped however you like. A tooltip that is never closed is reported as an error:

```txt
Eukaryota/Chromalveolatae,Excavatae
Excavatae:""Single-celled, mostly flagellated
  eukaryotes, many of them parasites""
```

While you type a name inside a TreeGlyph block, TreeGlyph suggests names already used in that block. Pick one with the arrow keys and Enter (or a click), or press Escape to keep typing. There are no suggestions while you type inside `((…))` or `:""…""`.

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
