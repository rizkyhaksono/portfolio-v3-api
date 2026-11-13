import { generateIdFromEntropySize } from "lucia";

/** Lucia's default session lifetime. A row inserted here must match lucia.createSession. */
export const LUCIA_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type QueryRaw = <T>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;

type SessionWriter = {
  $queryRaw: QueryRaw;
  session: {
    create(args: { data: { id: string; userId: string; expiresAt: Date } }): Promise<unknown>;
  };
};

/**
 * Hold the user row, then insert a session only if the password hash is still the one
 * just verified. Password reset takes the same lock before it replaces the hash and
 * deletes sessions, so a login that already checked the old hash cannot write a
 * session that survives the reset. The insert stays on this transaction: lucia.createSession
 * uses another connection and would deadlock on the user-row foreign key.
 */
export async function createSessionIfPasswordUnchanged(
  tx: SessionWriter,
  user: { id: string; hashedPassword: string },
  now = Date.now(),
): Promise<string | null> {
  const rows = await tx.$queryRaw<Array<{ hashed_password: string | null }>>`
    SELECT hashed_password FROM "User" WHERE id = ${user.id} FOR UPDATE
  `;
  if (rows[0]?.hashed_password !== user.hashedPassword) return null;

  const id = generateIdFromEntropySize(25);
  await tx.session.create({
    data: {
      id,
      userId: user.id,
      expiresAt: new Date(now + LUCIA_SESSION_TTL_MS),
    },
  });
  return id;
}

/** Serialize password reset with createSessionIfPasswordUnchanged on the same user row. */
export async function lockUserForPasswordChange(tx: { $queryRaw: QueryRaw }, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}
