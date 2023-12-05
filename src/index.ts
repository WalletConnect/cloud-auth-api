import RedisStore from 'connect-redis'
import cors, { CorsOptions } from 'cors'
import dotenv from 'dotenv'
import express, { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import Session from 'express-session'
import { Redis } from 'ioredis'
import { SiweMessage, generateNonce } from 'siwe'
import { verifyAndSignIn } from './handlers/verify'
import { captchaVerification } from './middlewares/captchaVerification'

dotenv.config()

declare module 'express-session' {
  interface SessionData {
    nonce?: string
    siwe?: SiweMessage
  }
}

const { PORT, COOKIE_SECRET, COOKIE_NAME, REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } = process.env
if (!COOKIE_NAME) {
  throw new ReferenceError('COOKIE_NAME missing in environment variables')
}
if (!COOKIE_SECRET) {
  throw new ReferenceError('COOKIE_SECRET missing in environment variables')
}
if (!REDIS_HOST) {
  throw new ReferenceError('REDIS_HOST missing in environment variables')
}
if (!REDIS_HOST) {
  throw new ReferenceError('REDIS_HOST missing in environment variables')
}
if (!REDIS_PASSWORD) {
  throw new ReferenceError('REDIS_PASSWORD missing in environment variables')
}

// Initialize redis client
const redisClient = new Redis({
  host: REDIS_HOST ?? 'redis',
  port: REDIS_PORT ? parseInt(REDIS_PORT, 10) : 6379,
  password: REDIS_PASSWORD
})

// Initialize connect-redis store for express-session
const redisStore = new RedisStore({
  client: redisClient
})

const app = express()

// Disable header "x-powered-by: express"
app.disable('x-powered-by')
// Enable body parser
app.use(express.json())
app.set('trust proxy', 1)

const isProd = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV === 'development'

const allowedOrigins = isProd
  ? ['https://cloud.walletconnect.com']
  : ['http://localhost', 'https://wc-cloud-staging.vercel.app', /\.?-walletconnect1\.vercel\.app$/]

const corsOptions: CorsOptions = {
  credentials: true,
  methods: ['OPTIONS', 'GET', 'POST'],
  origin: (origin, callback) => {
    if (
      !origin ||
      isDev ||
      allowedOrigins.some((allowedOrigin) => new RegExp(allowedOrigin).test(origin))
    ) {
      callback(null, true)
    } else {
      callback(new Error(`Origin ${origin} is not allowed by CORS`))
    }
  }
}
app.use(cors(corsOptions))

app.use(
  Session({
    name: COOKIE_NAME,
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    store: redisStore,
    cookie: {
      secure: isDev ? false : true,
      sameSite: isProd ? 'strict' : 'none',
      maxAge: 144 * 60 * 60 * 1000,
      httpOnly: true
    }
  })
)

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 200, // Limit each IP to 200 requests per `window` (here, per 10 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
})

// Apply the rate limiting middleware to all requests
app.use(limiter)

app.get('/health', async function (req, res) {
  return res.status(200).json({ status: 'OK' })
})

app.post('/nonce', captchaVerification, async function (req, res) {
  req.session.nonce = generateNonce()

  return req.session.save(() => res.status(200).json({ nonce: req.session.nonce }))
})

app.post('/connect', captchaVerification, verifyAndSignIn)

app.post('/session', captchaVerification, async function (req, res) {
  const siweSession = req.session.siwe
  if (!siweSession) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  return res.status(200).json({ session: siweSession })
})

app.post('/disconnect', async function (req, res) {
  res.clearCookie(COOKIE_NAME)
  return req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to destroy session' })
    }
    return res.status(200).json({ status: 'Disconnected' })
  })
})

// custom 404
app.use((req, res, next) => {
  return res.status(404).json({ error: "Sorry can't find that!" })
})

// custom error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  return res.status(500).json({ error: 'Something went wrong!' })
})

const server = app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running on port ${PORT}`)
})

// Create a function to close the server and exit the process
const exitProcess = () => {
  console.log('Closing server and exiting process...')
  return server.close(() => {
    console.log('Server closed.')
    return process.exit(1)
  })
}

// Gracefully handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.log(`Uncaught exception: ${JSON.stringify(err)}`)
  return exitProcess()
})
process.on('unhandledRejection', (err) => {
  console.log(`Unhandled rejection: ${JSON.stringify(err)}`)
  return exitProcess()
})
