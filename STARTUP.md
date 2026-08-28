# LogicLens Startup Guide

Welcome to LogicLens! Here is how to run the application locally.

## Development Server (Recommended)

To run the application in development mode with hot-reloading:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

> Note: Make sure you use lowercase `npm run dev`. Commands like `NPM RUN DEV` or `npm next dev` will not work.

## Production Build

To test the optimized production build of the application:

1. First, build the application:
   ```bash
   npm run build
   ```
2. Then, start the production server:
   ```bash
   npm start
   ```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

- **`Unknown command: "RUN"`**: Commands are case-sensitive. Use `npm run dev` instead of `NPM RUN DEV`.
- **`Could not find a production build in the '.next' directory`**: You must run `npm run build` before running `npm start`.
- **`next : The term 'next' is not recognized`**: The `next` CLI is installed locally in the project, not globally. Use `npm run dev` which automatically uses the local `next` binary, or use `npx next dev`.
