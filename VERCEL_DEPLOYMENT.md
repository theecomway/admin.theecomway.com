# Vercel Deployment Guide

This project has been configured for deployment on Vercel. Follow these steps to deploy your app:

## Prerequisites

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Make sure you have a Vercel account at [vercel.com](https://vercel.com)

## Environment Variables

1. Copy the environment variables template:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your actual Firebase configuration values:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

## Deployment Options

### Option 1: Deploy via Vercel CLI

1. Login to Vercel:
   ```bash
   vercel login
   ```

2. Deploy the project:
   ```bash
   vercel
   ```

3. Follow the prompts to configure your project

### Option 2: Deploy via Vercel Dashboard

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)

3. Click "New Project"

4. Import your Git repository

5. Vercel will automatically detect it's a Next.js project and configure it

6. Add your environment variables in the project settings

7. Click "Deploy"

## Configuration Files Added

- `vercel.json` - Vercel deployment configuration
- `next.config.js` - Next.js configuration optimized for Vercel
- `.vercelignore` - Files to ignore during deployment
- `.env.example` - Environment variables template

## Scripts Available

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run vercel-build` - Build specifically for Vercel

## API Routes

Your API routes in `pages/api/` are already configured for Vercel:
- `/api/hello` - Test endpoint
- `/api/flipkart-login-proxy` - Flipkart login proxy
- `/api/flipkart-verify-otp` - Flipkart OTP verification

## Troubleshooting

If you encounter issues:

1. Check that all environment variables are set correctly
2. Ensure your Firebase project is properly configured
3. Check the Vercel function logs in the dashboard
4. Verify that all dependencies are listed in `package.json`

## Support

For Vercel-specific issues, check the [Vercel documentation](https://vercel.com/docs) or [Next.js documentation](https://nextjs.org/docs).

