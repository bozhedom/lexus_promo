import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "certificates" ADD COLUMN "image_id" uuid;
  ALTER TABLE "certificates" ADD CONSTRAINT "certificates_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "certificates_image_idx" ON "certificates" USING btree ("image_id");
  ALTER TABLE "certificates" DROP COLUMN "image_url";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "certificates" DROP CONSTRAINT "certificates_image_id_media_id_fk";
  
  DROP INDEX "certificates_image_idx";
  ALTER TABLE "certificates" ADD COLUMN "image_url" varchar;
  ALTER TABLE "certificates" DROP COLUMN "image_id";`)
}
