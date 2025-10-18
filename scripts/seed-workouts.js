#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const exerciseSeed = [
  {
    name: 'Bench Press',
    category: 'Göğüs',
    equipment: 'Barbell',
    difficulty: 'Orta',
    instructions:
      "Sırt üstü yatarak barbell'i kontrollü şekilde göğse indirin ve yukarı itin.",
    videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    targetMuscles: ['Pectoralis Major', 'Anterior Deltoid', 'Triceps'],
    tips: 'Ayaklarınızı yere sıkıca bastırın, sırtınızı hafif kavisli tutun',
    safetyNotes: 'Mutlaka spotter ile çalışın, ağırlığı kontrol edin',
    variations: ['Incline Bench Press', 'Decline Bench Press', 'Dumbbell Bench Press']
  },
  {
    name: 'Squat',
    category: 'Bacak',
    equipment: 'Barbell',
    difficulty: 'Orta',
    instructions: 'Ayaklar omuz genişliğinde, kalçayı geriye iterek çömelin ve dik konuma dönün.',
    videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    tips: 'Göğsü dik tutun, ağırlığı topuklarda hissedin',
    safetyNotes: 'Dizleri içe kaçırmayın, sırt düz kalmalı',
    variations: ['Front Squat', 'Goblet Squat', 'Bulgarian Split Squat']
  },
  {
    name: 'Deadlift',
    category: 'Sırt',
    equipment: 'Barbell',
    difficulty: 'İleri',
    instructions: 'Barbell\'i yerden kaldırarak dik duruşa geçin. Kalça ve dizleri aynı anda açın.',
    videoUrl: 'https://www.youtube.com/watch?v=ytGaGIn3SjE',
    targetMuscles: ['Erector Spinae', 'Glutes', 'Hamstrings', 'Traps'],
    tips: 'Barı vücuda yakın tutun, omuzlar barın üzerinde olsun',
    safetyNotes: 'Sırt düz kalmalı, ani hareketlerden kaçının',
    variations: ['Romanian Deadlift', 'Sumo Deadlift', 'Trap Bar Deadlift']
  },
  {
    name: 'Push-up',
    category: 'Göğüs',
    equipment: 'Vücut Ağırlığı',
    difficulty: 'Başlangıç',
    instructions: 'Plank pozisyonunda vücudu yukarı aşağı hareket ettirin. Eller omuz genişliğinde olmalı.',
    videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    targetMuscles: ['Pectoralis Major', 'Triceps', 'Anterior Deltoid', 'Core'],
    tips: 'Vücut düz bir çizgi halinde, core kasılı tutun',
    safetyNotes: 'Boyun nötr pozisyonda, kalça çökmesin',
    variations: ['Diamond Push-up', 'Wide Push-up', 'Incline Push-up']
  },
  {
    name: 'Pull-up',
    category: 'Sırt',
    equipment: 'Pull-up Bar',
    difficulty: 'İleri',
    instructions: 'Bardan asılı durumda vücudu yukarı çekin. Çene bar seviyesine gelene kadar çekin.',
    videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    targetMuscles: ['Latissimus Dorsi', 'Biceps', 'Rhomboids'],
    tips: 'Core kasılı tutun, hareketi kontrollü yapın',
    safetyNotes: 'Omuz eklemini ısıtın, ani hareketlerden kaçının',
    variations: ['Chin-up', 'Wide Grip Pull-up', 'Assisted Pull-up']
  },
  {
    name: 'Overhead Press',
    category: 'Omuz',
    equipment: 'Barbell',
    difficulty: 'Orta',
    instructions: "Barbell'i omuz seviyesinden başın üzerine itin. Core kasılı tutun.",
    videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
    targetMuscles: ['Anterior Deltoid', 'Medial Deltoid', 'Triceps', 'Core'],
    tips: 'Kalça ileri itmeyin, dikey hareket yapın',
    safetyNotes: 'Boyun nötr, sırt düz kalmalı',
    variations: ['Dumbbell Press', 'Seated Press', 'Push Press']
  }
]

const templateSeed = [
  {
    name: 'Başlangıç Tam Vücut',
    description: 'Yeni başlayanlar için 3 günlük tam vücut programı',
    duration: 45,
    difficulty: 'Başlangıç',
    videoUrl: 'https://www.youtube.com/watch?v=Z5VMH6V-5K8',
    muscleGroups: ['Tam Vücut'],
    exercises: [
      { exerciseName: 'Bench Press', day: 'Pazartesi', order: 1, sets: 3, reps: '12', rest: 90 },
      { exerciseName: 'Squat', day: 'Pazartesi', order: 2, sets: 3, reps: '10', rest: 120 },
      { exerciseName: 'Push-up', day: 'Çarşamba', order: 1, sets: 4, reps: '15', rest: 60 },
      { exerciseName: 'Deadlift', day: 'Cuma', order: 1, sets: 3, reps: '8', rest: 150 }
    ]
  },
  {
    name: 'Kas Yapımı - PPL',
    description: 'Push/Pull/Legs split ile ileri seviye kas yapımı programı',
    duration: 60,
    difficulty: 'İleri',
    videoUrl: 'https://www.youtube.com/watch?v=4ibacCqIFsA',
    muscleGroups: ['Göğüs', 'Sırt', 'Bacak'],
    exercises: [
      { exerciseName: 'Bench Press', day: 'Pazartesi', order: 1, sets: 4, reps: '8', rest: 120 },
      { exerciseName: 'Overhead Press', day: 'Pazartesi', order: 2, sets: 3, reps: '10', rest: 90 },
      { exerciseName: 'Pull-up', day: 'Salı', order: 1, sets: 4, reps: 'AMRAP', rest: 120 },
      { exerciseName: 'Deadlift', day: 'Salı', order: 2, sets: 3, reps: '6', rest: 180 },
      { exerciseName: 'Squat', day: 'Perşembe', order: 1, sets: 4, reps: '10', rest: 150 }
    ]
  }
]

async function main() {
  const exercises = {}
  for (const item of exerciseSeed) {
    const created = await prisma.exerciseTemplate.upsert({
      where: { name: item.name },
      create: item,
      update: {
        category: item.category,
        equipment: item.equipment,
        difficulty: item.difficulty,
        instructions: item.instructions,
        videoUrl: item.videoUrl,
        targetMuscles: item.targetMuscles,
        tips: item.tips,
        safetyNotes: item.safetyNotes,
        variations: item.variations
      }
    })
    exercises[item.name] = created
  }

  for (const tpl of templateSeed) {
    const template = await prisma.workoutTemplate.upsert({
      where: { name: tpl.name },
      create: {
        name: tpl.name,
        description: tpl.description,
        duration: tpl.duration,
        difficulty: tpl.difficulty,
        videoUrl: tpl.videoUrl,
        muscleGroups: tpl.muscleGroups,
        exercises: {
          create: tpl.exercises.map((ex, index) => ({
            exerciseTemplateId: exercises[ex.exerciseName].id,
            day: ex.day,
            order: ex.order ?? index + 1,
            sets: ex.sets,
            reps: ex.reps,
            rest: ex.rest,
            weight: ex.weight ?? null,
            notes: ex.notes ?? null
          }))
        }
      },
      update: {
        description: tpl.description,
        duration: tpl.duration,
        difficulty: tpl.difficulty,
        videoUrl: tpl.videoUrl,
        muscleGroups: tpl.muscleGroups,
        exercises: {
          deleteMany: {},
          create: tpl.exercises.map((ex, index) => ({
            exerciseTemplateId: exercises[ex.exerciseName].id,
            day: ex.day,
            order: ex.order ?? index + 1,
            sets: ex.sets,
            reps: ex.reps,
            rest: ex.rest,
            weight: ex.weight ?? null,
            notes: ex.notes ?? null
          }))
        }
      }
    })

    console.log(`Seeded template: ${template.name}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
