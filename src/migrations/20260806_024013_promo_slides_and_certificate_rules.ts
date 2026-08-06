import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "promo_slides" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"caption" varchar NOT NULL,
  	"desktop_image_id" uuid,
  	"mobile_image_id" uuid,
  	"desktop_path" varchar,
  	"mobile_path" varchar,
  	"address" varchar,
  	"order" numeric DEFAULT 100 NOT NULL,
  	"active" boolean DEFAULT true NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "certificate_rules_models" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"model" varchar NOT NULL
  );
  
  CREATE TABLE "certificate_rules" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"brand" varchar,
  	"amount" numeric NOT NULL,
  	"priority" numeric DEFAULT 100 NOT NULL,
  	"active" boolean DEFAULT true NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "promo_slides_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "certificate_rules_id" uuid;
  ALTER TABLE "promo_slides" ADD CONSTRAINT "promo_slides_desktop_image_id_media_id_fk" FOREIGN KEY ("desktop_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "promo_slides" ADD CONSTRAINT "promo_slides_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certificate_rules_models" ADD CONSTRAINT "certificate_rules_models_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."certificate_rules"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "promo_slides_desktop_image_idx" ON "promo_slides" USING btree ("desktop_image_id");
  CREATE INDEX "promo_slides_mobile_image_idx" ON "promo_slides" USING btree ("mobile_image_id");
  CREATE INDEX "promo_slides_order_idx" ON "promo_slides" USING btree ("order");
  CREATE INDEX "promo_slides_active_idx" ON "promo_slides" USING btree ("active");
  CREATE INDEX "promo_slides_updated_at_idx" ON "promo_slides" USING btree ("updated_at");
  CREATE INDEX "promo_slides_created_at_idx" ON "promo_slides" USING btree ("created_at");
  CREATE INDEX "certificate_rules_models_order_idx" ON "certificate_rules_models" USING btree ("_order");
  CREATE INDEX "certificate_rules_models_parent_id_idx" ON "certificate_rules_models" USING btree ("_parent_id");
  CREATE INDEX "certificate_rules_priority_idx" ON "certificate_rules" USING btree ("priority");
  CREATE INDEX "certificate_rules_active_idx" ON "certificate_rules" USING btree ("active");
  CREATE INDEX "certificate_rules_updated_at_idx" ON "certificate_rules" USING btree ("updated_at");
  CREATE INDEX "certificate_rules_created_at_idx" ON "certificate_rules" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_promo_slides_fk" FOREIGN KEY ("promo_slides_id") REFERENCES "public"."promo_slides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_certificate_rules_fk" FOREIGN KEY ("certificate_rules_id") REFERENCES "public"."certificate_rules"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_promo_slides_id_idx" ON "payload_locked_documents_rels" USING btree ("promo_slides_id");
  CREATE INDEX "payload_locked_documents_rels_certificate_rules_id_idx" ON "payload_locked_documents_rels" USING btree ("certificate_rules_id");

  INSERT INTO "promo_slides" ("id", "caption", "desktop_path", "mobile_path", "address", "order", "active") VALUES
    ('00000000-0000-4000-8000-000000000101', 'Современный сервисный центр', '/images/redesign/service-center.webp', '/images/redesign/service-center-mobile-test.webp', 'Снеговая, 1 · «Таксопарк»', 10, true),
    ('00000000-0000-4000-8000-000000000102', 'Премиальный уровень обслуживания', '/images/gallery-2.webp', '/images/gallery-2-mobile-test.webp', NULL, 20, true),
    ('00000000-0000-4000-8000-000000000103', 'Комфорт для каждого гостя', '/images/gallery-3.webp', '/images/gallery-3-mobile-test.webp', NULL, 30, true),
    ('00000000-0000-4000-8000-000000000104', 'Технологии и инновации', '/images/gallery-1.webp', '/images/gallery-1-mobile-test.webp', NULL, 40, true),
    ('00000000-0000-4000-8000-000000000105', 'Собственная территория и парковка', '/images/gallery-map.jpg', '/images/gallery-map-mobile-test.webp', NULL, 50, true);

  INSERT INTO "certificate_rules" ("id", "title", "brand", "amount", "priority", "active") VALUES
    ('00000000-0000-4000-8000-000000000201', 'Toyota — тестовая группа 1000 ₽', 'Toyota', 1000, 200, true),
    ('00000000-0000-4000-8000-000000000202', 'Lexus — тестовая группа 1500 ₽', 'Lexus', 1500, 100, true);

  INSERT INTO "certificate_rules_models" ("_order", "_parent_id", "id", "model") VALUES
    (1, '00000000-0000-4000-8000-000000000201', 'seed-toyota-camry', 'Camry'),
    (2, '00000000-0000-4000-8000-000000000201', 'seed-toyota-rav4', 'RAV4'),
    (1, '00000000-0000-4000-8000-000000000202', 'seed-lexus-rx', 'RX'),
    (2, '00000000-0000-4000-8000-000000000202', 'seed-lexus-nx', 'NX');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_promo_slides_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_certificate_rules_fk";
  DROP INDEX "payload_locked_documents_rels_promo_slides_id_idx";
  DROP INDEX "payload_locked_documents_rels_certificate_rules_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "promo_slides_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "certificate_rules_id";
  ALTER TABLE "promo_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "certificate_rules_models" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "certificate_rules" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "promo_slides" CASCADE;
  DROP TABLE "certificate_rules_models" CASCADE;
  DROP TABLE "certificate_rules" CASCADE;`)
}
