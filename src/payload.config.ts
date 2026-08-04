import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { en } from "@payloadcms/translations/languages/en";
import { ru } from "@payloadcms/translations/languages/ru";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Applications } from "./collections/Applications";
import { Certificates } from "./collections/Certificates";
import { Events } from "./collections/Events";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  routes: {
    // REST Payload уходит на /payload-api, чтобы не конфликтовать с публичными
    // эндпоинтами воронки на /api/*
    api: "/payload-api",
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeDashboard: [
        "/components/admin/FunnelDashboard/FunnelDashboard#FunnelDashboard",
      ],
    },
  },
  collections: [Applications, Certificates, Events, Users, Media],
  i18n: {
    supportedLanguages: { en, ru },
    fallbackLanguage: "ru",
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    idType: "uuid",
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
  }),
  sharp,
  plugins: [],
});
