# Quartz v4

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.
Quartz v4 features a from-the-ground rewrite focusing on end-user extensibility and ease-of-use.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Quick Start

```bash
npm install
npx quartz build --serve
```

## Run Locally

This project runs with Node.js (not Python).

### Prerequisites

- Node.js `>=22`
- npm `>=10.9.2`

Check versions:

```bash
node -v
npm -v
```

### Install dependencies

From the repo root:

```bash
npm install
```

### Start local dev server

Serve your notes in `content/` with live rebuilds:

```bash
npx quartz build --serve
```

By default Quartz serves on `http://localhost:8080`.

### Build once (no local server)

```bash
npx quartz build
```

### Optional: run docs site locally

```bash
npm run docs
```

### Troubleshooting

- `python -m quartz --help` fails because Quartz is a Node CLI, not a Python module.
- If `npx quartz` is not found, run `npm install` first.
- If the port is busy, stop the other process or run on a different port (see Quartz docs).

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>
