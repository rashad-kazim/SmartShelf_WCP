<div align="center">

</div>

# SmartShelf WCP Frontend

Next.js 16 based SmartShelf admin panel.

## Run Locally

**Prerequisites:** Node.js 20+

1. Install dependencies:

```bash
npm install
```

2. Run the app:

```bash
npm run dev
```

3. Open the browser:

```text
http://localhost:3000
```

## Windows One-Click Start

Use the helper script in the project root for one-click startup:

```text
start-dev.cmd
```

This script switches into the project directory and runs `npm.cmd run dev`. It also avoids the `C:\Windows\package.json` error that can happen when the terminal starts from a UNC path.
