import { prisma } from '../../db/prisma.js';

export async function ensureDefaultEntityForUser(userId: string) {
  const existing = await prisma.entity.findFirst({ where: { userId, isDefault: true } });
  if (existing) return existing;

  // Create a default entity (single-entity now, entityId still required everywhere)
  return await prisma.entity.create({
    data: {
      userId,
      name: 'Personal',
      isDefault: true,
    },
  });
}

export async function resolveEntityForUser(userId: string, requestedEntityId?: string | null) {
  const entityId = (requestedEntityId || '').trim();
  if (entityId) {
    const ent = await prisma.entity.findFirst({ where: { id: entityId, userId } });
    if (!ent) return null;
    return ent;
  }
  return await ensureDefaultEntityForUser(userId);
}


