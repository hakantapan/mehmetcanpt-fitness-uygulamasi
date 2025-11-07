type TemplatePayload = {
  subject: string
  html: string
  text?: string
}

const appName = process.env.APP_NAME || "Mehmetcanpt Uzaktan Eğitim"

const buildHtmlLayout = (title: string, body: string) => `
  <div style="font-family: Arial, sans-serif; background-color:#f5f5f5; padding:24px;">
    <div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1); padding:24px; color:#ffffff;">
        <h1 style="margin:0; font-size:22px;">${appName}</h1>
        <p style="margin:8px 0 0; font-size:16px; opacity:0.9;">${title}</p>
      </div>
      <div style="padding:24px; color:#1f2937;">
        ${body}
      </div>
      <div style="padding:16px 24px; font-size:12px; color:#6b7280; background-color:#f9fafb;">
        Bu e-posta otomatik olarak gönderilmiştir. Sorularınız için lütfen bizimle iletişime geçin.
      </div>
    </div>
  </div>
`

export function verificationEmail({ name, verificationUrl }: { name?: string | null; verificationUrl: string }): TemplatePayload {
  const greeting = name ? `${name}` : "Merhaba"
  return {
    subject: `${appName} | E-posta Doğrulaması`,
    html: buildHtmlLayout(
      "Hesabınızı doğrulayın",
      `
        <p style="font-size:16px;">${greeting},</p>
        <p style="font-size:15px; line-height:1.6;">
          Kaydınızı tamamlamak için aşağıdaki butona tıklayarak e-posta adresinizi doğrulayın.
        </p>
        <p style="text-align:center; margin:32px 0;">
          <a href="${verificationUrl}" style="display:inline-block; padding:12px 24px; background-color:#2563eb; color:#ffffff; border-radius:999px; text-decoration:none; font-weight:600;">
            E-posta adresimi doğrula
          </a>
        </p>
        <p style="font-size:13px; color:#6b7280;">Buton çalışmazsa aşağıdaki bağlantıyı tarayıcınıza kopyalayın:<br />
          <span style="word-break:break-all;">${verificationUrl}</span>
        </p>
      `
    ),
    text: `${greeting},

Kaydınızı tamamlamak için bu bağlantıya gidin: ${verificationUrl}

${appName}`,
  }
}

export function loginNotificationEmail({ name, ip, date }: { name?: string | null; ip?: string | null; date: Date }): TemplatePayload {
  const formattedDate = date.toLocaleString("tr-TR")
  return {
    subject: `${appName} | Yeni oturum açma bildirimi`,
    html: buildHtmlLayout(
      "Hesabınıza giriş yapıldı",
      `
        <p style="font-size:16px;">${name ?? "Merhaba"},</p>
        <p style="font-size:15px; line-height:1.6;">Hesabınıza aşağıdaki bilgilerle giriş yapıldı:</p>
        <ul style="font-size:14px; line-height:1.8; color:#4b5563;">
          <li><strong>Tarih:</strong> ${formattedDate}</li>
          ${ip ? `<li><strong>IP Adresi:</strong> ${ip}</li>` : ""}
        </ul>
        <p style="font-size:14px; line-height:1.6;">Bu işlem size ait değilse lütfen hemen şifrenizi değiştirerek destek ekibimizle iletişime geçin.</p>
      `
    ),
  }
}

export function supportTicketCreatedEmail({ name, subject }: { name?: string | null; subject: string }): TemplatePayload {
  return {
    subject: `${appName} | Yeni destek talebi: ${subject}`,
    html: buildHtmlLayout(
      "Yeni destek talebi",
      `
        <p style="font-size:16px;">Merhaba,</p>
        <p style="font-size:15px; line-height:1.6;">${name ?? "Bir kullanıcı"} yeni bir destek kaydı oluşturdu.</p>
        <p style="font-size:15px; line-height:1.6;"><strong>Konu:</strong> ${subject}</p>
        <p style="font-size:14px; color:#6b7280;">Lütfen en kısa sürede yanıtlayın.</p>
      `
    ),
  }
}

export function questionAnsweredEmail({ name, question, answer }: { name?: string | null; question: string; answer: string }): TemplatePayload {
  return {
    subject: `${appName} | Sorunuz yanıtlandı`,
    html: buildHtmlLayout(
      "Sorunuz yanıtlandı",
      `
        <p style="font-size:16px;">${name ?? "Merhaba"},</p>
        <p style="font-size:15px; line-height:1.6;">Sorunuza yeni bir yanıt var:</p>
        <div style="margin:16px 0; padding:16px; border-radius:12px; background-color:#f3f4f6; color:#374151;">
          <p style="margin:0 0 8px; font-weight:600;">Sorunuz</p>
          <p style="margin:0 0 12px;">${question}</p>
          <p style="margin:0 0 8px; font-weight:600;">Yanıt</p>
          <p style="margin:0;">${answer}</p>
        </div>
        <p style="font-size:14px; color:#6b7280;">Sorularınız için her zaman buradayız.</p>
      `
    ),
  }
}

export function programAssignedEmail({
  name,
  programType,
  trainerName,
}: {
  name?: string | null
  programType: "Antrenman" | "Diyet" | "Supplement"
  trainerName?: string | null
}): TemplatePayload {
  return {
    subject: `${appName} | Yeni ${programType} programınız hazır`,
    html: buildHtmlLayout(
      `${programType} programınız hazır`,
      `
        <p style="font-size:16px;">${name ?? "Merhaba"},</p>
        <p style="font-size:15px; line-height:1.6;">
          ${trainerName ? `${trainerName} tarafından` : "Eğitmeniniz tarafından"} yeni bir ${programType.toLowerCase()} programı atandı.
        </p>
        <p style="font-size:14px; color:#6b7280;">Uygulama üzerinden programınızı inceleyerek hemen başlayabilirsiniz.</p>
      `
    ),
  }
}

export function packageAssignedEmail({
  name,
  packageName,
  durationInDays,
  price,
  currency,
  trainerName,
  startsAt,
}: {
  name?: string | null
  packageName: string
  durationInDays: number
  price: number
  currency: string
  trainerName?: string | null
  startsAt: Date
}): TemplatePayload {
  const startDate = startsAt.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const endsAt = new Date(startsAt)
  endsAt.setDate(endsAt.getDate() + Math.max(durationInDays, 0))
  const endDate = endsAt.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return {
    subject: `${appName} | ${packageName} paketiniz aktive edildi`,
    html: buildHtmlLayout(
      "Yeni paketiniz hazır",
      `
        <p style="font-size:16px;">${name ?? "Merhaba"},</p>
        <p style="font-size:15px; line-height:1.6;">
          ${trainerName ? `${trainerName},` : "Eğitmeniniz,"} sizin için <strong>${packageName}</strong> paketini aktive etti.
        </p>
        <ul style="font-size:14px; line-height:1.8; color:#4b5563;">
          <li><strong>Başlangıç Tarihi:</strong> ${startDate}</li>
          <li><strong>Bitiş Tarihi:</strong> ${endDate}</li>
          <li><strong>Süre:</strong> ${durationInDays} gün</li>
          <li><strong>Paket Ücreti:</strong> ${price} ${currency}</li>
        </ul>
        <p style="font-size:14px; line-height:1.6;">
          Paket kapsamında sunulan tüm içeriklere uygulama üzerinden erişebilirsiniz.
          Sorularınız olursa lütfen bizimle iletişime geçin.
        </p>
      `
    ),
    text: `${name ?? "Merhaba"},

${trainerName ? `${trainerName},` : "Eğitmeniniz,"} sizin için ${packageName} paketini aktive etti.

- Başlangıç Tarihi: ${startDate}
- Bitiş Tarihi: ${endDate}
- Süre: ${durationInDays} gün
- Paket Ücreti: ${price} ${currency}

${appName}`,
  }
}

export function weeklyCheckinEmail({ name }: { name?: string | null }): TemplatePayload {
  return {
    subject: `${appName} | Haftalık kontrol hatırlatması`,
    html: buildHtmlLayout(
      "Haftalık kontrol zamanı",
      `
        <p style="font-size:16px;">${name ?? "Merhaba"},</p>
        <p style="font-size:15px; line-height:1.6;">
          Haftalık planını gözden geçirmeni ve ilerlemeni paylaşmanı istiyoruz. Soruların varsa hemen bize yazabilirsin.
        </p>
        <p style="font-size:14px; color:#6b7280;">Hedeflerine ulaşman için buradayız!</p>
      `
    ),
  }
}
