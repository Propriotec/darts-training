This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Modular Architecture (Games)

The app is now split so game logic is isolated and easy to extend:

- `/Users/ryan/Documents/Repos/darts-training/src/components/DartsLiveScorer.tsx`: shell app, tabs, week/session handling
- `/Users/ryan/Documents/Repos/darts-training/src/components/darts/camera/CameraReferee.tsx`: camera detection + auto-throw emit
- `/Users/ryan/Documents/Repos/darts-training/src/components/darts/history/History.tsx`: progress dashboard
- `/Users/ryan/Documents/Repos/darts-training/src/games/*`: one folder per game
- `/Users/ryan/Documents/Repos/darts-training/src/games/types.ts`: shared game contract
- `/Users/ryan/Documents/Repos/darts-training/src/games/index.ts`: game registry

### Add a New Game

1. Create a game module in `/Users/ryan/Documents/Repos/darts-training/src/games/<your-game>/<YourGame>.tsx`.
2. Export a `GameDefinition`:
   - `id`: unique id
   - `label`: tab label
   - `tabColor`: tab color
   - `Component`: React component using `GameComponentProps`
3. Register it in `/Users/ryan/Documents/Repos/darts-training/src/games/index.ts`.

No changes are needed in `/Users/ryan/Documents/Repos/darts-training/src/components/DartsLiveScorer.tsx` for normal game additions.
