import nodemailer from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import type { LogLevel } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  verificationEmail,
  loginNotificationEmail,
  supportTicketCreatedEmail,
  questionAnsweredEmail,
  programAssignedEmail,
  weeklyCheckinEmail,
  packageAssignedEmail,
} from "@/lib/email-templates"

type MailConfig = {
  host: string
  port: number
  secure: boolean
  auth?: {
    user: string
    pass: string
  }
  fromName: string
  fromEmail: string
  replyTo?: string | null
}

type SendMailOptions = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

type MailMeta = {
  type?: string
  actorId?: string | null
  actorEmail?: string | null
  source?: string | null
  level?: LogLevel
  context?: Record<string, unknown>
}

let cachedTransport: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null
let cachedSignature: string | null = null

const envMailConfig = (): MailConfig | null => {
  if (!process.env.SMTP_HOST) return null
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    fromName: process.env.MAIL_FROM_NAME || "Mehmetcan PT",
    fromEmail: process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || "noreply@example.com",
    replyTo: process.env.MAIL_REPLY_TO || null,
  }
}

async function loadMailConfig(): Promise<MailConfig | null> {
  const dbConfig = await prisma.mailSetting.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  if (dbConfig) {
    return {
      host: dbConfig.host,
      port: dbConfig.port,
      secure: dbConfig.secure,
      auth:
        dbConfig.username && dbConfig.password
          ? {
              user: dbConfig.username,
              pass: dbConfig.password,
            }
          : undefined,
      fromName: dbConfig.fromName,
      fromEmail: dbConfig.fromEmail,
      replyTo: dbConfig.replyTo,
    }
  }

  return envMailConfig()
}

async function getTransporter() {
  const config = await loadMailConfig()
  if (!config) {
    throw new Error("SMTP yapılandırması bulunamadı")
  }

  const signature = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth?.user ?? null,
    fromEmail: config.fromEmail,
  })

  if (!cachedTransport || cachedSignature !== signature) {
    cachedTransport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    })
    cachedSignature = signature
  }

  return { transporter: cachedTransport, config }
}

export async function sendMail(options: SendMailOptions) {
  const { transporter, config } = await getTransporter()

  const mailOptions = {
    from: `${config.fromName} <${config.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: config.replyTo ?? undefined,
  }

  return transporter.sendMail(mailOptions)
}

const MAIL_DEFAULT_SOURCE = "mail"
const MAIL_SUCCESS_LEVEL: LogLevel = "AUDIT"

const toRecipientArray = (input: string | string[]): string[] => (Array.isArray(input) ? input : [input])

const mergeMeta = (defaults: MailMeta, meta?: MailMeta): MailMeta => {
  if (!meta) return defaults
  return {
    ...defaults,
    ...meta,
    context: {
      ...(defaults.context ?? {}),
      ...(meta.context ?? {}),
    },
  }
}

const mailLabel = (meta: MailMeta | undefined, fallback: string) => meta?.type ?? fallback

async function recordMailLog(entry: {
  level: LogLevel
  message: string
  actorId?: string | null
  actorEmail?: string | null
  source?: string | null
  context?: Record<string, unknown>
}) {
  try {
    await prisma.adminLog.create({
      data: {
        level: entry.level,
        message: entry.message,
        actorId: entry.actorId ?? undefined,
        actorEmail: entry.actorEmail ?? undefined,
        source: entry.source ?? MAIL_DEFAULT_SOURCE,
        context: entry.context,
      },
    })
  } catch (error) {
    console.error("Mail log yazılamadı:", error)
  }
}

async function safeSend(mail: SendMailOptions, meta?: MailMeta) {
  const recipients = toRecipientArray(mail.to)
  const contextBase: Record<string, unknown> = {
    ...(meta?.context ?? {}),
    recipients,
    subject: mail.subject,
  }

  try {
    const info = await sendMail(mail)
    const deliveryContext: Record<string, unknown> = {
      ...contextBase,
      delivery: {
        messageId: (info as SMTPTransport.SentMessageInfo).messageId ?? null,
        accepted: (info as SMTPTransport.SentMessageInfo).accepted ?? [],
        rejected: (info as SMTPTransport.SentMessageInfo).rejected ?? [],
        response: (info as SMTPTransport.SentMessageInfo).response ?? null,
      },
    }

    await recordMailLog({
      level: meta?.level ?? MAIL_SUCCESS_LEVEL,
      message: `${mailLabel(meta, "E-posta")} bildirimi gönderildi`,
      actorId: meta?.actorId ?? null,
      actorEmail: meta?.actorEmail ?? null,
      source: meta?.source ?? MAIL_DEFAULT_SOURCE,
      context: deliveryContext,
    })

    return info
  } catch (error) {
    console.error("Mail gönderilemedi:", error)

    const errorContext: Record<string, unknown> = {
      ...contextBase,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : {
              message: String(error),
            },
    }

    await recordMailLog({
      level: "ERROR",
      message: `${mailLabel(meta, "E-posta")} bildirimi gönderilemedi`,
      actorId: meta?.actorId ?? null,
      actorEmail: meta?.actorEmail ?? null,
      source: meta?.source ?? MAIL_DEFAULT_SOURCE,
      context: errorContext,
    })
  }
}

export async function sendVerificationEmail(
  to: string,
  params: { name?: string | null; verificationUrl: string },
  meta?: MailMeta,
) {
  const template = verificationEmail(params)
  const mergedMeta = mergeMeta(
    {
      type: "Kayıt doğrulaması",
      source: "auth",
      context: {
        verificationUrl: params.verificationUrl,
      },
    },
    meta,
  )
  await safeSend({ to, ...template }, mergedMeta)
}

export async function sendLoginNotificationEmail(
  to: string,
  params: { name?: string | null; ip?: string | null },
  meta?: MailMeta,
) {
  const template = loginNotificationEmail({ ...params, date: new Date() })
  const mergedMeta = mergeMeta(
    {
      type: "Giriş bildirimi",
      source: "auth",
      context: {
        ip: params.ip ?? null,
      },
    },
    meta,
  )
  await safeSend({ to, ...template }, mergedMeta)
}

export async function sendSupportTicketNotification(
  to: string | string[],
  params: { name?: string | null; subject: string },
  meta?: MailMeta,
) {
  const template = supportTicketCreatedEmail(params)
  const mergedMeta = mergeMeta(
    {
      type: "Destek talebi bildirimi",
      source: "support",
      context: {
        subject: params.subject,
      },
    },
    meta,
  )
  await safeSend({ to, ...template }, mergedMeta)
}

export async function sendQuestionAnsweredEmail(
  to: string,
  params: { name?: string | null; question: string; answer: string },
  meta?: MailMeta,
) {
  const template = questionAnsweredEmail(params)
  const mergedMeta = mergeMeta(
    {
      type: "Soru yanıt bildirimi",
      source: "support",
      context: {
        question: params.question,
      },
    },
    meta,
  )
  await safeSend({ to, ...template }, mergedMeta)
}

export async function sendProgramAssignedEmail(
  to: string,
  params: { name?: string | null; programType: "Antrenman" | "Diyet" | "Supplement"; trainerName?: string | null },
  meta?: MailMeta,
) {
  const template = programAssignedEmail(params)
  const mergedMeta = mergeMeta(
    {
      type: `${params.programType} program bildirimi`,
      source: "trainer",
      context: {
        programType: params.programType,
        trainerName: params.trainerName ?? null,
      },
    },
    meta,
  )
  await safeSend({ to, ...template }, mergedMeta)
}

export async function sendWeeklyCheckinEmail(to: string, params: { name?: string | null }, meta?: MailMeta) {
  const template = weeklyCheckinEmail(params)
  const mergedMeta = mergeMeta(
    {
      type: "Haftalık takip hatırlatması",
      source: "scheduler",
    },
    meta,
  )
  await safeSend({ to, ...template }, mergedMeta)
}

export async function sendPackageAssignedEmail(
  to: string,
  params: {
    name?: string | null
    packageName: string
    durationInDays: number
    price: number
    currency: string
    trainerName?: string | null
    startsAt: Date
  },
  meta?: MailMeta,
) {
  const template = packageAssignedEmail(params)
  const mergedMeta = mergeMeta(
    {
      type: "Paket ataması",
      source: "subscription",
      context: {
        packageName: params.packageName,
        durationInDays: params.durationInDays,
        price: params.price,
        currency: params.currency,
        startsAt: params.startsAt.toISOString(),
      },
    },
    meta,
  )
  await safeSend({ to, ...template }, mergedMeta)
}

export async function testMailConnection() {
  try {
    const { transporter } = await getTransporter()
    await transporter.verify()
    return true
  } catch (error) {
    console.error("SMTP doğrulama hatası:", error)
    return false
  }
}
