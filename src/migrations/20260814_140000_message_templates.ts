import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Раздел «Тексты сообщений»: формулировки, которые уходят в мессенджеры.
 *
 * Значений по умолчанию в самой таблице нет намеренно — они живут в описании
 * полей и в `src/invite-test/config/certificates.ts`. Пустое поле означает
 * «взять текст из кода», поэтому пустая таблица — рабочее состояние, а не
 * повод чинить раздел.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "message_templates" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "delivery" varchar,
      "opening" varchar,
      "booking" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "message_templates" CASCADE;
  `)
}
