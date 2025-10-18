#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      const next = line[i + 1]
      if (next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += char
  }

  result.push(current)
  return result.map((value) => value.trim())
}

function readCsv(filePath) {
  const absolutePath = path.resolve(filePath)
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV dosyası bulunamadı: ${absolutePath}`)
  }

  const content = fs.readFileSync(absolutePath, 'utf8')
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^"|"$/g, ''))

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line).map((value) => value.replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })
}

async function importClients(filePath) {
  const rows = readCsv(filePath)
  if (rows.length === 0) {
    console.log('CSV dosyasında kayıt bulunamadı.')
    return
  }

  let created = 0
  let updated = 0
  const errors = []
  const passwordCache = new Map()

  for (const row of rows) {
    const email = row.Email?.toLowerCase()
    const firstName = row.Ad?.trim()
    const lastName = row.Soyad?.trim()
    const phone = row.full_phone?.trim() || row.Telefon?.trim() || null
    const passwordPlain = row['Şifre']

    if (!email || !passwordPlain || !firstName || !lastName) {
      errors.push({ email, reason: 'Eksik zorunlu alan' })
      continue
    }

    try {
      let password = passwordCache.get(passwordPlain)
      if (!password) {
        password = await bcrypt.hash(passwordPlain, 10)
        passwordCache.set(passwordPlain, password)
      }

      const result = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          password,
          role: 'CLIENT',
          isActive: true,
          profile: {
            create: {
              firstName,
              lastName,
              phone,
            }
          }
        },
        update: {
          password,
          role: 'CLIENT',
          isActive: true,
          profile: {
            upsert: {
              create: {
                firstName,
                lastName,
                phone,
              },
              update: {
                firstName,
                lastName,
                phone,
              }
            }
          }
        },
      })

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created += 1
      } else {
        updated += 1
      }
    } catch (error) {
      errors.push({ email, reason: error.message })
    }
  }

  await prisma.$disconnect()

  console.log(`Toplam kayıt: ${rows.length}`)
  console.log(`Oluşturulan: ${created}`)
  console.log(`Güncellenen: ${updated}`)
  if (errors.length > 0) {
    console.log('Hatalar:')
    errors.forEach((err) => console.log(`- ${err.email || '<bilinmiyor>'}: ${err.reason}`))
  }
}

async function main() {
  const [, , csvPath] = process.argv
  if (!csvPath) {
    console.error('Kullanım: node scripts/import-clients.js <csv-dosyasi-yolu>')
    process.exit(1)
  }

  try {
    await importClients(csvPath)
  } catch (error) {
    console.error('İçe aktarma hatası:', error)
    process.exit(1)
  }
}

main()
