import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "car_catalog" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "brand" varchar NOT NULL,
      "order" numeric DEFAULT 100 NOT NULL,
      "active" boolean DEFAULT true NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "car_catalog_brand_unique" UNIQUE("brand")
    );

    CREATE TABLE "car_catalog_models" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "model" varchar NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "car_catalog_id" uuid;
    ALTER TABLE "car_catalog_models" ADD CONSTRAINT "car_catalog_models_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."car_catalog"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_car_catalog_fk"
      FOREIGN KEY ("car_catalog_id") REFERENCES "public"."car_catalog"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "car_catalog_brand_idx" ON "car_catalog" USING btree ("brand");
    CREATE INDEX "car_catalog_order_idx" ON "car_catalog" USING btree ("order");
    CREATE INDEX "car_catalog_active_idx" ON "car_catalog" USING btree ("active");
    CREATE INDEX "car_catalog_updated_at_idx" ON "car_catalog" USING btree ("updated_at");
    CREATE INDEX "car_catalog_created_at_idx" ON "car_catalog" USING btree ("created_at");
    CREATE INDEX "car_catalog_models_order_idx" ON "car_catalog_models" USING btree ("_order");
    CREATE INDEX "car_catalog_models_parent_id_idx" ON "car_catalog_models" USING btree ("_parent_id");
    CREATE INDEX "payload_locked_documents_rels_car_catalog_id_idx"
      ON "payload_locked_documents_rels" USING btree ("car_catalog_id");

    INSERT INTO "car_catalog" ("id", "brand", "order", "active") VALUES
      ('00000000-0000-4000-8000-000000000301', 'Toyota', 10, true),
      ('00000000-0000-4000-8000-000000000302', 'Lexus', 20, true);

    INSERT INTO "car_catalog_models" ("_order", "_parent_id", "id", "model") VALUES
      (1, '00000000-0000-4000-8000-000000000301', 'toyota-camry', 'Camry'),
      (2, '00000000-0000-4000-8000-000000000301', 'toyota-corolla', 'Corolla'),
      (3, '00000000-0000-4000-8000-000000000301', 'toyota-rav4', 'RAV4'),
      (4, '00000000-0000-4000-8000-000000000301', 'toyota-land-cruiser', 'Land Cruiser'),
      (5, '00000000-0000-4000-8000-000000000301', 'toyota-land-cruiser-prado', 'Land Cruiser Prado'),
      (6, '00000000-0000-4000-8000-000000000301', 'toyota-highlander', 'Highlander'),
      (7, '00000000-0000-4000-8000-000000000301', 'toyota-fortuner', 'Fortuner'),
      (8, '00000000-0000-4000-8000-000000000301', 'toyota-chr', 'C-HR'),
      (9, '00000000-0000-4000-8000-000000000301', 'toyota-avensis', 'Avensis'),
      (10, '00000000-0000-4000-8000-000000000301', 'toyota-vitz', 'Vitz'),
      (11, '00000000-0000-4000-8000-000000000301', 'toyota-alphard', 'Alphard'),
      (12, '00000000-0000-4000-8000-000000000301', 'toyota-hilux', 'Hilux'),
      (1, '00000000-0000-4000-8000-000000000302', 'lexus-rx', 'RX'),
      (2, '00000000-0000-4000-8000-000000000302', 'lexus-nx', 'NX'),
      (3, '00000000-0000-4000-8000-000000000302', 'lexus-lx', 'LX'),
      (4, '00000000-0000-4000-8000-000000000302', 'lexus-gx', 'GX'),
      (5, '00000000-0000-4000-8000-000000000302', 'lexus-es', 'ES'),
      (6, '00000000-0000-4000-8000-000000000302', 'lexus-is', 'IS'),
      (7, '00000000-0000-4000-8000-000000000302', 'lexus-ls', 'LS'),
      (8, '00000000-0000-4000-8000-000000000302', 'lexus-ux', 'UX'),
      (9, '00000000-0000-4000-8000-000000000302', 'lexus-gs', 'GS'),
      (10, '00000000-0000-4000-8000-000000000302', 'lexus-rc', 'RC');
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT "payload_locked_documents_rels_car_catalog_fk";
    DROP INDEX "payload_locked_documents_rels_car_catalog_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "car_catalog_id";
    ALTER TABLE "car_catalog_models" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "car_catalog" DISABLE ROW LEVEL SECURITY;
    DROP TABLE "car_catalog_models" CASCADE;
    DROP TABLE "car_catalog" CASCADE;
  `)
}
