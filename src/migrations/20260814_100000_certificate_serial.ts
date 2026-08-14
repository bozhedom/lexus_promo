import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Номер выдачи, который печатается в правом нижнем углу пригласительного.
 * У каждого вида свой отсчёт с единицы, поэтому уже выписанным сертификатам
 * номера проставляются по порядку создания — отдельно диагностике и отдельно
 * замене масла.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "serial" numeric;

    UPDATE "certificates" AS c
    SET "serial" = ordered."number"
    FROM (
      SELECT "id", ROW_NUMBER() OVER (PARTITION BY "kind" ORDER BY "created_at", "id") AS "number"
      FROM "certificates"
    ) AS ordered
    WHERE c."id" = ordered."id" AND c."serial" IS NULL;

    CREATE INDEX IF NOT EXISTS "certificates_serial_idx" ON "certificates" USING btree ("serial");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "certificates_serial_idx";
    ALTER TABLE "certificates" DROP COLUMN IF EXISTS "serial";
  `)
}
