# Cloud Auth API

This is an API built with Express, Prisma and TypeScript which aims to replace our self-hosted Supabase GoTrue instance.

## Prerequisites

To run this API, you will need:

- Node.js (version 16 or higher)
- npm

## Getting Started

1. Clone this repository to your local machine.

```sh
git clone https://github.com/WalletConnect/cloud-auth-api.git
```

2. Install the dependencies.

```sh
cd cloud-auth-api
npm install
```

3. Set up your environment variables

```sh
cp .env.example .env
```

4. Set up Prisma

```sh
npx prisma generate

// optionally, you can run Prisma Studio
npx prisma studio
```

5. Start the development server.

```sh
npm run dev
```

The server will start on port 3333. You can access it at `http://localhost:3333`.

## API Endpoints

This API has the following endpoints:

- `GET /nonce` - Gets a nonce.
- `POST /connect` - Creates a new user along with a session, an identity and gerenates access and refresh tokens.
  If the user already exists, it'll get updated and new access and refresh tokens will be generated.
