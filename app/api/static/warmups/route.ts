import { NextResponse } from "next/server"

type WarmupExercise = {
  name: string
  duration: number
  description: string
  targetMuscles: string[]
  instructions: string
}

type WarmupRoutine = {
  id: string
  name: string
  icon: string
  duration: number
  difficulty: "Kolay" | "Orta" | "Zor"
  description: string
  focus: string
  exercises: WarmupExercise[]
}

const routines: WarmupRoutine[] = [
  {
    id: "general-warmup",
    name: "Genel Isınma",
    icon: "flame",
    duration: 10,
    difficulty: "Kolay",
    description: "Antrenman öncesi tüm vücudu harekete geçirir, dolaşımı hızlandırır.",
    focus: "Kalp atışını yükseltme, eklemleri hazırlama",
    exercises: [
      {
        name: "Yerinde Yürüyüş",
        duration: 60,
        description: "Kolları sallayarak yerinde yürüyün",
        targetMuscles: ["Tüm Vücut"],
        instructions: "Dizleri yukarı kaldırarak yerinde yürüyün, kolları doğal olarak sallayın.",
      },
      {
        name: "Kol Çevirme",
        duration: 45,
        description: "Kolları dairesel hareket ettirin",
        targetMuscles: ["Omuz", "Kol"],
        instructions: "Kolları yana açın, küçük dairelerden büyüklere geçiş yaparak çevirin.",
      },
      {
        name: "Bacak Salınımı",
        duration: 45,
        description: "Bacakları öne arkaya sallayın",
        targetMuscles: ["Kalça", "Bacak"],
        instructions: "Bir ayak üzerinde durup diğer bacağı öne-arkaya kontrollü bir şekilde sallayın.",
      },
      {
        name: "Torso Twist",
        duration: 40,
        description: "Gövdeyi sağa sola çevirin",
        targetMuscles: ["Core", "Bel"],
        instructions: "Ayaklar omuz genişliğinde, kollar göğüste, gövdeyi sağa sola çevirin.",
      },
      {
        name: "Hafif Zıplama",
        duration: 60,
        description: "Yerinde hafif zıplayın",
        targetMuscles: ["Bacak", "Kalp"],
        instructions: "Ayak parmak uçlarında küçük zıplamalar yapın, kolları ritme dahil edin.",
      },
    ],
  },
  {
    id: "full-stretch",
    name: "Genel Esneme",
    icon: "leaf",
    duration: 15,
    difficulty: "Kolay",
    description: "Tüm vücut için temel esneme hareketleri sunar.",
    focus: "Kasları rahatlatma, esneklik artırma",
    exercises: [
      {
        name: "Boyun Esneme",
        duration: 30,
        description: "Boynu sağa sola eğin",
        targetMuscles: ["Boyun"],
        instructions: "Başı sağa eğin, 15 saniye tutun; diğer tarafa tekrarlayın.",
      },
      {
        name: "Omuz Esneme",
        duration: 30,
        description: "Omuzları esnetin",
        targetMuscles: ["Omuz"],
        instructions: "Bir kolu göğüs hizasında karşı tarafa çekin, diğer elle destekleyin.",
      },
      {
        name: "Göğüs Açma",
        duration: 30,
        description: "Göğüs kaslarını açın",
        targetMuscles: ["Göğüs"],
        instructions: "Kolları arkada birleştirip yukarı kaldırarak göğsü açın.",
      },
      {
        name: "Hamstring Esneme",
        duration: 45,
        description: "Arka bacak kaslarını esnetin",
        targetMuscles: ["Hamstring"],
        instructions: "Oturarak bir bacağı uzatın, öne doğru eğilip ayak parmaklarına uzanın.",
      },
      {
        name: "Kalça Açma",
        duration: 45,
        description: "Kalça kaslarını esnetin",
        targetMuscles: ["Kalça"],
        instructions: "Çömelme pozisyonuna inerek dirseklerle dizleri dışa itin.",
      },
      {
        name: "Baldır Esneme",
        duration: 30,
        description: "Baldır kaslarını esnetin",
        targetMuscles: ["Baldır"],
        instructions: "Duvara yaslanıp arka bacağı düz tutarak topuğu yere bastırın.",
      },
    ],
  },
  {
    id: "cooldown",
    name: "Soğuma",
    icon: "moon",
    duration: 8,
    difficulty: "Kolay",
    description: "Antrenman sonrası nabzı düşürmeye ve kasları sakinleştirmeye odaklanır.",
    focus: "Nefes kontrolü, nabız düşürme",
    exercises: [
      {
        name: "Derin Nefes",
        duration: 60,
        description: "Derin nefes alıp verin",
        targetMuscles: ["Akciğer"],
        instructions: "4 saniye nefes alın, 4 saniye tutun, 4 saniye verin.",
      },
      {
        name: "Çocuk Pozu",
        duration: 60,
        description: "Yoga çocuk pozunda dinlenin",
        targetMuscles: ["Sırt", "Omuz"],
        instructions: "Dizler üzerinde oturup kolları öne uzatın, alnı yere koyun.",
      },
      {
        name: "Kedi-İnek",
        duration: 45,
        description: "Omurgayı hareket ettirin",
        targetMuscles: ["Omurga"],
        instructions: "Dört ayak üzerinde sırtı yukarı ve aşağı olacak şekilde sırayla esnetin.",
      },
      {
        name: "Bacak Duvar",
        duration: 90,
        description: "Bacakları duvara yaslayın",
        targetMuscles: ["Bacak", "Dolaşım"],
        instructions: "Sırt üstü yatıp bacakları duvara yaslayın, 90 saniye kalın.",
      },
      {
        name: "Son Nefes",
        duration: 30,
        description: "Rahat nefes alıp verin",
        targetMuscles: ["Tüm Vücut"],
        instructions: "Rahat bir pozisyonda derin nefeslerle kasları gevşetin.",
      },
    ],
  },
  {
    id: "mobility",
    name: "Mobilite",
    icon: "activity",
    duration: 12,
    difficulty: "Orta",
    description: "Eklem hareket kabiliyetini artırmak için mobilite odaklı hareketler içerir.",
    focus: "Eklem açısı, stabilite",
    exercises: [
      {
        name: "Kalça Çemberi",
        duration: 40,
        description: "Kalçayı dairesel hareket ettirin",
        targetMuscles: ["Kalça"],
        instructions: "Ayakta, kalçayı önce saat yönünde sonra ters yönde daire çizdirin.",
      },
      {
        name: "Omuz Mobilitesi",
        duration: 45,
        description: "Omuz eklemini açın",
        targetMuscles: ["Omuz"],
        instructions: "Bir sopa veya havlu ile kolları yukarı ve arkaya doğru hareket ettirin.",
      },
      {
        name: "Bilek Esnetme",
        duration: 30,
        description: "Bilekleri esnetin",
        targetMuscles: ["Bilek"],
        instructions: "Avuç içlerini zemine koyarak hafifçe öne-arkaya esnetin.",
      },
      {
        name: "T-Spine Rotasyonu",
        duration: 45,
        description: "Göğüs omurgasını hareket ettirin",
        targetMuscles: ["Sırt"],
        instructions: "Diz üstü pozisyonda, eli başın arkasına alın ve dirseği tavana doğru açın.",
      },
      {
        name: "Ayak Bileği Mobilitesi",
        duration: 40,
        description: "Ayak bileklerini açın",
        targetMuscles: ["Ayak Bileği"],
        instructions: "Bir diz üzerinde durup öndeki dizinizi ayak parmaklarının ilerisine hafifçe ittirin.",
      },
    ],
  },
]

export async function GET() {
  return NextResponse.json({ routines })
}
