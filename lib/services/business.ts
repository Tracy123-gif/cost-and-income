import { prisma } from "../prisma";

export async function getFirstBusiness() {
  return prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function createBusiness(input: { name: string; currency?: string; timezone?: string }) {
  return prisma.business.create({
    data: {
      name: input.name,
      currency: input.currency ?? "NGN",
      timezone: input.timezone ?? "Africa/Lagos",
    },
  });
}

export async function updateBusiness(id: string, input: { name?: string; currency?: string; timezone?: string }) {
  return prisma.business.update({ where: { id }, data: input });
}
