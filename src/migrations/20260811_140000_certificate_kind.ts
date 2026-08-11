import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * На гостя выписывается пара пригласительных — диагностика и подарок в честь
 * знакомства, — поэтому уникальность переезжает с заявки на пару
 * «заявка + вид». Старые сертификаты считаем диагностикой.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_certificates_kind" AS ENUM('diagnostics', 'gift');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "certificates"
      ADD COLUMN IF NOT EXISTS "kind" "enum_certificates_kind" DEFAULT 'diagnostics' NOT NULL;

    -- уникальность переезжает с заявки на пару «заявка + вид»
    DROP INDEX IF EXISTS "certificates_application_idx";

    CREATE INDEX IF NOT EXISTS "certificates_application_idx"
      ON "certificates" USING btree ("application_id");
    CREATE INDEX IF NOT EXISTS "certificates_kind_idx" ON "certificates" USING btree ("kind");
    CREATE UNIQUE INDEX IF NOT EXISTS "certificates_application_kind_idx"
      ON "certificates" USING btree ("application_id", "kind");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "certificates" WHERE "kind" = 'gift';

    DROP INDEX IF EXISTS "certificates_application_kind_idx";
    DROP INDEX IF EXISTS "certificates_kind_idx";
    DROP INDEX IF EXISTS "certificates_application_idx";

    ALTER TABLE "certificates" DROP COLUMN "kind";
    DROP TYPE "public"."enum_certificates_kind";

    CREATE UNIQUE INDEX "certificates_application_idx" ON "certificates" USING btree ("application_id");
  `)
}
