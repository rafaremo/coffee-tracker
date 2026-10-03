import { prisma } from "./db.server";

export async function getAllCoffees({
  search,
  favoriteOnly,
  userId,
  skip = 0,
  limit = 50,
}: {
  search?: string;
  favoriteOnly?: boolean;
  userId?: string;
  skip?: number;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};

  if (userId) {
    where.userId = userId;
  }

  if (favoriteOnly) {
    where.isFavorite = true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { country: { contains: search, mode: "insensitive" } },
      { region: { contains: search, mode: "insensitive" } },
      { variety: { contains: search, mode: "insensitive" } },
      { tastingNotes: { contains: search, mode: "insensitive" } },
      { tags: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.coffeeEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.coffeeEntry.count({ where }),
  ]);

  return { items, total };
}

export async function getCoffeeById(id: number) {
  return prisma.coffeeEntry.findUnique({ where: { id } });
}

export async function createCoffee(data: Record<string, unknown>) {
  return prisma.coffeeEntry.create({ data: data as never });
}

export async function updateCoffee(id: number, data: Record<string, unknown>) {
  return prisma.coffeeEntry.update({
    where: { id },
    data: data as never,
  });
}

export async function deleteCoffee(id: number) {
  return prisma.coffeeEntry.delete({ where: { id } });
}

export async function getStats(userId?: string) {
  const where = userId ? { userId } : {};
  const [
    totalEntries,
    totalFavorites,
    avgRating,
    avgSca,
    allEntries,
  ] = await Promise.all([
    prisma.coffeeEntry.count({ where }),
    prisma.coffeeEntry.count({ where: { ...where, isFavorite: true } }),
    prisma.coffeeEntry.aggregate({ where, _avg: { myRating: true } }),
    prisma.coffeeEntry.aggregate({ where, _avg: { scaScore: true } }),
    prisma.coffeeEntry.findMany({ where }),
  ]);

  const countField = (field: string) => {
    const counts: Record<string, number> = {};
    for (const entry of allEntries) {
      const val = (entry as Record<string, unknown>)[field];
      if (val) {
        counts[String(val)] = (counts[String(val)] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const countCommaField = (field: string) => {
    const counts: Record<string, number> = {};
    for (const entry of allEntries) {
      const val = (entry as Record<string, unknown>)[field] as string;
      if (val) {
        for (const item of val.split(",")) {
          const trimmed = item.trim();
          if (trimmed) {
            counts[trimmed] = (counts[trimmed] || 0) + 1;
          }
        }
      }
    }
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const ratingDist = [
    { range: "0-2", count: 0 },
    { range: "2-4", count: 0 },
    { range: "4-6", count: 0 },
    { range: "6-8", count: 0 },
    { range: "8-10", count: 0 },
  ];
  for (const entry of allEntries) {
    const r = entry.myRating;
    if (r != null) {
      if (r < 2) ratingDist[0].count++;
      else if (r < 4) ratingDist[1].count++;
      else if (r < 6) ratingDist[2].count++;
      else if (r < 8) ratingDist[3].count++;
      else ratingDist[4].count++;
    }
  }

  return {
    totalEntries,
    totalFavorites,
    avgRating: avgRating._avg.myRating
      ? Math.round(avgRating._avg.myRating * 100) / 100
      : null,
    avgScaScore: avgSca._avg.scaScore
      ? Math.round(avgSca._avg.scaScore * 100) / 100
      : null,
    topCountries: countField("country"),
    topRegions: countField("region"),
    topVarieties: countField("variety"),
    topProcesses: countField("process"),
    topBrewingMethods: countCommaField("brewingMethods"),
    roastLevels: countField("roastLevel"),
    ratingDistribution: ratingDist,
    favoriteBrands: countField("brand"),
  };
}
