import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const coffees = [
  {
    name: "Ethiopia Yirgacheffe",
    brand: "Onyx Coffee Lab",
    country: "Ethiopia",
    region: "Yirgacheffe",
    variety: "Heirloom",
    process: "Washed",
    altitudeMasl: 1950,
    roastLevel: "Light",
    myRating: 9.2,
    scaScore: 87.5,
    tastingNotes: "jasmine, bergamot, lemon, black tea",
    body: "Light",
    acidity: "Bright",
    sweetness: "High",
    brewingMethods: "V60, Chemex, Pour Over",
    isFavorite: true,
    tags: "specialty, floral, bright",
  },
  {
    name: "Colombia Huila Pink Bourbon",
    brand: "Counter Culture",
    country: "Colombia",
    region: "Huila",
    variety: "Pink Bourbon",
    process: "Honey",
    altitudeMasl: 1800,
    roastLevel: "Medium-Light",
    myRating: 8.7,
    scaScore: 85.0,
    tastingNotes: "strawberry, caramel, milk chocolate",
    body: "Medium",
    acidity: "Medium",
    sweetness: "High",
    brewingMethods: "V60, Aeropress",
    isFavorite: true,
    tags: "fruity, sweet",
  },
  {
    name: "Guatemala Antigua",
    brand: "Intelligentsia",
    country: "Guatemala",
    region: "Antigua",
    variety: "Bourbon",
    process: "Washed",
    altitudeMasl: 1650,
    roastLevel: "Medium",
    myRating: 7.8,
    scaScore: 82.0,
    tastingNotes: "cocoa, nutty, brown sugar",
    body: "Full",
    acidity: "Low",
    sweetness: "Medium",
    brewingMethods: "French Press, Drip",
    tags: "chocolate, nutty",
  },
  {
    name: "Kenya AA",
    brand: "Blue Bottle",
    country: "Kenya",
    region: "Nyeri",
    variety: "SL28, SL34",
    process: "Washed",
    altitudeMasl: 1850,
    roastLevel: "Light",
    myRating: 8.5,
    scaScore: 86.0,
    tastingNotes: "blackcurrant, tomato, lime",
    body: "Medium",
    acidity: "High",
    sweetness: "Medium",
    brewingMethods: "V60, Chemex",
    isFavorite: true,
    tags: "fruity, complex",
  },
  {
    name: "Costa Rica Tarraz\u00fa",
    brand: "Verve Coffee",
    country: "Costa Rica",
    region: "Tarraz\u00fa",
    variety: "Catuai",
    process: "Anaerobic",
    altitudeMasl: 1750,
    roastLevel: "Light",
    myRating: 9.0,
    scaScore: 88.0,
    tastingNotes: "mango, passion fruit, honey",
    body: "Light",
    acidity: "Bright",
    sweetness: "High",
    brewingMethods: "V60, Aeropress, Pour Over",
    isFavorite: true,
    tags: "tropical, experimental",
  },
  {
    name: "Panama Geisha Elida",
    brand: "Ninety Plus",
    country: "Panama",
    region: "Boquete",
    variety: "Geisha",
    process: "Natural",
    altitudeMasl: 2000,
    roastLevel: "Light",
    myRating: 9.8,
    scaScore: 92.5,
    tastingNotes: "jasmine, peach, tropical fruit, honey",
    body: "Light",
    acidity: "Bright",
    sweetness: "High",
    brewingMethods: "V60, Chemex",
    isFavorite: true,
    tags: "geisha, exceptional",
  },
];

async function main() {
  for (const coffee of coffees) {
    await prisma.coffeeEntry.create({ data: coffee as never });
  }
  console.log(`Seeded ${coffees.length} coffees`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
