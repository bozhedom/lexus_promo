import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Кадры автомобилей для пригласительных: коллекция-загрузка «Фото автомобилей».
 * Кадр подбирается по марке, модели и году, поэтому по этим полям идут индексы.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "car_photos" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "title" varchar,
      "brand" varchar NOT NULL,
      "model" varchar,
      "year_from" numeric,
      "year_to" numeric,
      "plate_hidden" boolean DEFAULT false,
      "plate_x" numeric DEFAULT 40.2,
      "plate_y" numeric DEFAULT 61.7,
      "plate_width" numeric DEFAULT 16.7,
      "active" boolean DEFAULT true NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric,
      "sizes_raster_url" varchar,
      "sizes_raster_width" numeric,
      "sizes_raster_height" numeric,
      "sizes_raster_mime_type" varchar,
      "sizes_raster_filesize" numeric,
      "sizes_raster_filename" varchar,
      "sizes_thumbnail_url" varchar,
      "sizes_thumbnail_width" numeric,
      "sizes_thumbnail_height" numeric,
      "sizes_thumbnail_mime_type" varchar,
      "sizes_thumbnail_filesize" numeric,
      "sizes_thumbnail_filename" varchar
    );

    CREATE INDEX IF NOT EXISTS "car_photos_brand_idx" ON "car_photos" USING btree ("brand");
    CREATE INDEX IF NOT EXISTS "car_photos_model_idx" ON "car_photos" USING btree ("model");
    CREATE INDEX IF NOT EXISTS "car_photos_active_idx" ON "car_photos" USING btree ("active");
    CREATE INDEX IF NOT EXISTS "car_photos_updated_at_idx" ON "car_photos" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "car_photos_created_at_idx" ON "car_photos" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "car_photos_filename_idx" ON "car_photos" USING btree ("filename");
    CREATE INDEX IF NOT EXISTS "car_photos_sizes_raster_sizes_raster_filename_idx"
      ON "car_photos" USING btree ("sizes_raster_filename");
    CREATE INDEX IF NOT EXISTS "car_photos_sizes_thumbnail_sizes_thumbnail_filename_idx"
      ON "car_photos" USING btree ("sizes_thumbnail_filename");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "car_photos_id" uuid;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_car_photos_fk"
        FOREIGN KEY ("car_photos_id") REFERENCES "public"."car_photos"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_car_photos_id_idx"
      ON "payload_locked_documents_rels" USING btree ("car_photos_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_car_photos_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_car_photos_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "car_photos_id";
    DROP TABLE IF EXISTS "car_photos" CASCADE;
  `)
}
