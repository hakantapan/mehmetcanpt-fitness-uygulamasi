import cron from "node-cron"
import { sendWeeklyCheckinReminderEmails } from "@/lib/mail-jobs"

let initialized = false

export function ensureMailScheduler() {
  if (initialized) return
  if (process.env.DISABLE_CRON === "true") return
  initialized = true

  cron.schedule(
    "0 9 * * 1,5",
    async () => {
      try {
        await sendWeeklyCheckinReminderEmails()
      } catch (error) {
        console.error("Haftalık e-posta gönderimi hatası:", error)
      }
    },
    {
      timezone: process.env.CRON_TIMEZONE || "Europe/Istanbul",
    },
  )
}
