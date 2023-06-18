import type {LoaderArgs} from '@remix-run/node'
import {format, logger} from 'logger'
import {typedjson} from 'remix-typedjson'

import {queue} from '~/queues/transaction.server'
import {NewPaymentIntentSchema} from '~/schemas'
import {
  addWatchOnlyAddress,
  createWatchOnlyWallet,
  getDescriptor,
} from '~/utils/bitcoin-core'
import {createContract} from '~/utils/contract'
import {env} from '~/utils/env.server'
import {prisma} from '~/utils/prisma.server'

export const contract = createContract({
  action: {
    body: NewPaymentIntentSchema,
  },
})

/**
 * Shows a list of all PaymentIntent objects.
 */
export async function loader() {
  const [paymentIntents, total] = await Promise.all([
    prisma.paymentIntent.findMany({
      orderBy: {createdAt: 'desc'},
    }),
    prisma.paymentIntent.count(),
  ])

  return typedjson({
    data: paymentIntents.map(pi => ({
      ...pi,
      amount: pi.amount.toNumber(),
      tolerance: pi.tolerance.toNumber(),
    })),
    total,
  })
}

/**
 * Creates a PaymentIntent object.
 */
export async function action({request}: LoaderArgs) {
  const {body: data} = await contract.action({request})

  const pi = await prisma.paymentIntent.create({
    data: {
      ...data,
      logs: {
        create: [
          {
            status: 'status_created',
          },
        ],
      },
    },
  })

  await createWatchOnlyWallet(pi.id)
  const descriptor = await getDescriptor(pi.address)
  await addWatchOnlyAddress({
    wallet: pi.id,
    descriptor,
  })

  const job = await queue.add(
    'check if payment was made',
    {
      paymentIntentId: pi.id,
    },
    {
      repeat: {
        pattern: env.RUNNING_TESTS
          ? '*/1 * * * * *' // every 1 seconds
          : '*/10 * * * * *', // every 10 seconds
      },
    },
  )

  logger.info(
    `Adding job (${format.magenta(
      job.id,
    )}) to check if payment (${format.magenta(pi.id)}) was made`,
  )

  return typedjson({
    ...pi,
    amount: pi.amount.toNumber(),
    tolerance: pi.tolerance.toNumber(),
  })
}