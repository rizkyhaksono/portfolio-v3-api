import { opentelemetry } from '@elysiajs/opentelemetry'
import { PrismaInstrumentation } from '@prisma/instrumentation'

export const instrumentation = opentelemetry({
  instrumentations: [new PrismaInstrumentation()]
})