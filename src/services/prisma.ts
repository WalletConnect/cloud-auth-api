import { PrismaClient, users } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { SiweMessage } from 'siwe'
import { DEFAULT_INSTANCE_ID, SEVEN_DAYS_IN_SECONDS, secureToken } from '../utils'
import { SiweDeprecationError } from '../utils/errors'
import { GoTrueClaims, TPrismaTransaction } from '../utils/types'

const prisma = new PrismaClient()

export const generateAccessToken = async (
  user: users,
  expiresIn: number,
  tx: TPrismaTransaction,
  sessionId?: string
): Promise<string> => {
  if (sessionId) {
    const session = await tx.sessions.findUnique({
      where: {
        id: sessionId
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }
  }

  if (!user.aud || !user.role || !sessionId) {
    throw new Error('Missing user information')
  }

  const claims: GoTrueClaims = {
    sub: user.id,
    aud: user.aud,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    app_metadata: user.raw_app_meta_data,
    user_metadata: user.raw_user_meta_data,
    role: user.role,
    session_id: sessionId,
    email: '',
    phone: ''
  }

  if (!process.env.SUPABASE_JWT_SECRET) {
    throw new Error('Missing secret')
  }

  const token = jwt.sign(claims, process.env.SUPABASE_JWT_SECRET)
  return token
}

export async function createOrUpdateUser(siweMsg: SiweMessage) {
  const tokens = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.users.findFirst({
      where: {
        raw_user_meta_data: {
          path: ['address'],
          equals: siweMsg.address
        },
        AND: {
          raw_user_meta_data: {
            path: ['chain_id'],
            equals: siweMsg.chainId.toString()
          }
        }
      }
    })

    if (!existingUser) {
      throw new SiweDeprecationError(
        'Wallet account sign-ups are deprecated. Please sign up with your email and password.'
      )
    }

    // Check for an existing session and update the last sign in date
    let existingSession = await tx.sessions.findFirst({
      where: {
        user_id: existingUser.id
      }
    })
    await tx.users.update({
      where: {
        id: existingUser.id
      },
      data: {
        last_sign_in_at: siweMsg.issuedAt
      }
    })
    if (!existingSession) {
      existingSession = await tx.sessions.create({
        data: {
          user_id: existingUser.id
        }
      })
    }

    let existingIdentity = await tx.identities.findFirst({
      where: {
        user_id: existingUser.id
      }
    })
    if (!existingIdentity) {
      await tx.identities.create({
        data: {
          id: existingUser.id,
          provider: 'eth',
          user_id: existingUser.id,
          provider_id: siweMsg.address,
          identity_data: {
            sub: existingUser.id,
            address: siweMsg.address
          },
          last_sign_in_at: siweMsg.issuedAt
        }
      })
    }

    // Generate access and refresh tokens
    const generatedRefreshToken = secureToken()

    const refreshToken = await tx.refresh_tokens.create({
      data: {
        session_id: existingSession.id,
        user_id: existingUser.id,
        instance_id: DEFAULT_INSTANCE_ID,
        parent: '',
        token: generatedRefreshToken
      }
    })
    const accessToken = await generateAccessToken(
      existingUser,
      SEVEN_DAYS_IN_SECONDS,
      tx,
      existingSession.id
    )

    return { refreshToken: refreshToken.token, accessToken }
  })

  return tokens
}
