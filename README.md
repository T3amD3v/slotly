<p align="center">
  <a href="https://nextjs-fastapi-starter.vercel.app/">
    <img src="https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png" height="96">
    <h3 align="center">Next.js FastAPI Starter</h3>
  </a>
</p>

<p align="center">Simple Next.j 14 boilerplate that uses <a href="https://fastapi.tiangolo.com/">FastAPI</a> as the API backend.</p>

<br/>

## Introduction

This is a hybrid Next.js 14 + Python template. One great use case of this is to write Next.js apps that use Python AI libraries on the backend, while still having the benefits of Next.js Route Handlers and Server Side Rendering.

## How It Works

The Python/FastAPI server is mapped into to Next.js app under `/api/`.

This is implemented using [`next.config.js` rewrites](https://github.com/digitros/nextjs-fastapi/blob/main/next.config.js) to map any request to `/api/py/:path*` to the FastAPI API, which is hosted in the `/api` folder.

Also, the app/api routes are available on the same domain, so you can use NextJs Route Handlers and make requests to `/api/...`.

On localhost, the rewrite will be made to the `127.0.0.1:8000` port, which is where the FastAPI server is running.

In production, the FastAPI server is hosted as [Python serverless functions](https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/python) on Vercel.

## Demo

https://nextjs-fastapi-starter.vercel.app/

## Deploy Your Own

You can clone & deploy it to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdigitros%2Fnextjs-fastapi%2Ftree%2Fmain)

## Developing Locally

You can clone & create this repo with the following command

```bash
npx create-next-app nextjs-fastapi --example "https://github.com/digitros/nextjs-fastapi"
```

## Getting Started

First, create and activate a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

Then, install the dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
```

Then, run the development server(python dependencies will be installed automatically here):

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The FastApi server will be running on [http://127.0.0.1:8000](http://127.0.0.1:8000) – feel free to change the port in `package.json` (you'll also need to update it in `next.config.js`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - learn about FastAPI features and API.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

# Google Calendar Automation
# Slotly

## Features

- **Google Calendar Integration**: Connect securely with OAuth to access and manage calendar events
- **Availability Finding**: Automatically find available time slots across multiple participants
- **Meeting Scheduling**: Schedule meetings in available time slots
- **Domain Restriction**: Default restriction to @teamodea.com email addresses, with configurable options for other domains
- **Time Zone Handling**: All times are processed in Central Standard Time (CST) for consistency
- **Secure Authentication**: Uses encrypted HTTP-only cookies for token storage

## Tech Stack

- **Frontend**: Next.js with React
- **Backend**: FastAPI (Python)
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS
- **Time Handling**: Date-fns (JavaScript) and pytz (Python)

## Working Hours

The application finds meeting slots within standard working hours:
- 8:00 AM to 5:00 PM CST
- Monday through Friday only

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- Google OAuth credentials (Client ID and Client Secret)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/google-calendar-automation.git
   cd google-calendar-automation
   ```

2. Install JavaScript dependencies:
   ```
   npm install
   ```

3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env.local` file based on `.env.local.example` and add your credentials:
   ```
   cp .env.local.example .env.local
   ```

5. Edit `.env.local` with your Google OAuth credentials and settings

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Calendar API
4. Configure the OAuth consent screen
5. Create OAuth client ID credentials
6. Add authorized redirect URIs (e.g., http://localhost:3000/api/auth/callback/google for development)

### Running the Application

Start the development server:

```
npm run dev
```

This will start both the Next.js frontend and FastAPI backend.

- Frontend: http://localhost:3000
- Backend API: http://localhost:3000/api/py/
- API Documentation: http://localhost:3000/docs

## Deployment

The application is designed to be deployed on Vercel:

1. Create a new Vercel project
2. Link to your repository
3. Add environment variables in the Vercel dashboard
4. Deploy

### Production Configuration

For production deployment, use the `.env.production` file as a template and make the following changes:

1. Set `NEXTAUTH_URL` to your production domain (https required)
2. Generate a new strong `NEXTAUTH_SECRET` value (never reuse development secrets)
3. Use production Google OAuth credentials that match your domain
4. Ensure `NODE_ENV` is set to `production`

## Security Considerations

- OAuth tokens are stored in encrypted HTTP-only cookies with the following security settings:
  - `secure: true` - Only transmitted over HTTPS
  - `sameSite: "strict"` - Prevents CSRF attacks
  - Cookie names prefixed with `__Secure-` in production
  - Domain restriction to `.teamodea.com` in production
- Domain restrictions are enforced for participant emails (only teamodea.com)
- CORS restrictions limit API access to only teamodea.com domains
- HTTPS is enforced in production

## License

[MIT License](LICENSE)
