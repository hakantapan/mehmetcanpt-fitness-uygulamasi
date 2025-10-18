import crypto from "crypto"

type TestConnectionParams = {
  merchantId: string
  merchantKey: string
  merchantSalt: string
  mode: "TEST" | "LIVE"
  merchantOkUrl?: string | null
  merchantFailUrl?: string | null
  currency?: string | null
  iframeDebug?: boolean | null
  non3d?: boolean | null
}

type PaytrTestResult =
  | { ok: true; token?: string; raw?: unknown }
  | { ok: false; reason: string; raw?: unknown }

const PAYTR_TEST_ENDPOINT = "https://www.paytr.com/odeme/api/get-token"

export function maskSecret(secret?: string | null) {
  if (!secret) return ""
  if (secret.length <= 4) return "*".repeat(secret.length)
  return `${secret.slice(0, 2)}${"*".repeat(Math.max(secret.length - 4, 4))}${secret.slice(-2)}`
}

export function redactSettingForClient(setting: {
  merchantKey?: string | null
  merchantSalt?: string | null
}) {
  return {
    merchantKey: setting.merchantKey ? "********" : "",
    merchantSalt: setting.merchantSalt ? "********" : "",
  }
}

export async function testPaytrConnection({
  merchantId,
  merchantKey,
  merchantSalt,
  mode,
  merchantOkUrl,
  merchantFailUrl,
  currency,
  iframeDebug,
  non3d,
}: TestConnectionParams): Promise<PaytrTestResult> {
  const userIp = "127.0.0.1"
  const merchantOid = `TEST-${Date.now()}`
  const email = "test@example.com"
  const paymentAmount = "100"
  const paymentType = "card"
  const installmentCount = "0"
  const resolvedCurrency = currency && currency.trim().length > 0 ? currency : "TL"
  const testMode = mode === "TEST" ? "1" : "0"
  const non3dValue = non3d ? "1" : "0"

  const hashString = [
    merchantId,
    userIp,
    merchantOid,
    email,
    paymentAmount,
    paymentType,
    installmentCount,
    resolvedCurrency,
    testMode,
    non3dValue,
    merchantSalt,
  ].join("")

  const paytrToken = crypto.createHmac("sha256", merchantKey).update(hashString, "utf8").digest("base64")

  const basket = Buffer.from(JSON.stringify([["Test Ürünü", "1", paymentAmount]])).toString("base64")

  const payload = new URLSearchParams({
    merchant_id: merchantId,
    user_ip: userIp,
    merchant_oid: merchantOid,
    email,
    payment_amount: paymentAmount,
    payment_type: paymentType,
    installment_count: installmentCount,
    currency: resolvedCurrency,
    test_mode: testMode,
    non_3d: non3dValue,
    merchant_ok_url: merchantOkUrl ?? "https://localhost/paytr/success",
    merchant_fail_url: merchantFailUrl ?? "https://localhost/paytr/fail",
    user_name: "Test Kullanıcı",
    user_address: "Test Mah. Test Sok. No:1",
    user_phone: "5555555555",
    user_basket: basket,
    debug_on: iframeDebug ? "1" : "0",
    paytr_token: paytrToken,
  })

  try {
    const response = await fetch(PAYTR_TEST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
    })

    const data = await response.json().catch(async () => {
      const text = await response.text().catch(() => null)
      return text
    })

    if (response.ok && data && typeof data === "object" && data.status === "success") {
      return { ok: true, token: data.token, raw: data }
    }

    const reason =
      (data && typeof data === "object" && typeof data.reason === "string" && data.reason) ||
      (typeof data === "string" ? data : "PayTR bağlantısı doğrulanamadı")

    return { ok: false, reason, raw: data }
  } catch (error) {
    return { ok: false, reason: (error as Error).message, raw: null }
  }
}
