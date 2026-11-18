import { postgresAdapter } from "@payloadcms/db-postgres";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";

import { Hosts } from "./collections/Hosts";
import { Media } from "./collections/Media";
import { Posts } from "./collections/Posts";
import { Shows } from "./collections/Shows";
import { Tags } from "./collections/Tags";
import { Users } from "./collections/Users";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Users, Posts, Tags, Shows, Hosts, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  // DATABASE_URL is the pooled Neon URL the Vercel marketplace integration sets.
  // push: false — schema changes go through `payload migrate:create` + `migrate`, never dev auto-push,
  // so the dev server can't drift the shared Neon database away from the committed migrations.
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL || "" }, push: false }),
  sharp,
  plugins: [
    redirectsPlugin({ collections: ["posts"] }),
    // Editors' uploads go browser -> Blob directly (Vercel caps server request bodies at 4.5 MB).
    vercelBlobStorage({ collections: { media: true }, token: process.env.BLOB_READ_WRITE_TOKEN, clientUploads: true }),
  ],
});
