import { ethers } from 'ethers'
import { Request, Response } from 'express'
import { SiweErrorType, SiweMessage } from 'siwe'
import { createOrUpdateUser } from '../services/prisma'

const provider = new ethers.JsonRpcProvider(
  `https://rpc.walletconnect.com/v1?chainId=eip155:1&projectId=${process.env.WALLETCONNECT_PROJECT_ID}`
)

export const verifyAndSignIn = async (req: Request, res: Response) => {
  try {
    if (!req.body.message) {
      return res.status(422).json({ message: 'Expected prepareMessage object as body.' })
    }

    const message = new SiweMessage(req.body.message)
    const fields = await message.verify(
      {
        signature: req.body.signature,
        nonce: req.session.nonce
      },
      {
        provider
      }
    )

    req.session.siwe = fields.data
    if (!fields.data.expirationTime) {
      return res.status(422).json({
        message: 'Expected expirationTime to be set.'
      })
    }
    req.session.cookie.expires = new Date(fields.data.expirationTime)

    const { accessToken, refreshToken } = await createOrUpdateUser(fields.data)

    return req.session.save(() => {
      return res.status(200).json({
        accessToken: accessToken,
        refreshToken: refreshToken
      })
    })
  } catch (e: any) {
    console.error(e)
    req.session.siwe = undefined
    req.session.nonce = undefined
    try {
      switch (e) {
        case SiweErrorType.EXPIRED_MESSAGE: {
          req.session.save(() => res.status(440).json({ message: e.message }))
          break
        }
        case SiweErrorType.INVALID_SIGNATURE: {
          req.session.save(() => res.status(422).json({ message: e.message }))
          break
        }
        case SiweErrorType.INVALID_ADDRESS: {
          req.session.save(() => res.status(422).json({ message: e.message }))
          break
        }
        case SiweErrorType.NONCE_MISMATCH: {
          req.session.save(() => res.status(400).json({ message: e.message }))
          break
        }
        case SiweErrorType.DOMAIN_MISMATCH: {
          req.session.save(() => res.status(400).json({ message: e.message }))
          break
        }
        default: {
          req.session.save(() => res.status(500).json({ message: e.message ?? `${e}` }))
          break
        }
      }
    } catch (sessionError) {
      console.error(`Failed to save session, ${JSON.stringify(sessionError)}`)
    }

    return
  }
}
