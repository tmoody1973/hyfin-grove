import { CdsSyncStatus } from "./globals/CdsSyncStatus";
import { adminSearchPlugin } from "@jhb.software/payload-admin-search";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { searchPlugin } from "@payloadcms/plugin-search";
import { seoPlugin } from "@payloadcms/plugin-seo";
import { mediaGalleryPlugin } from "payload-media-gallery";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import { BlocksFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";

import { Audio } from "./blocks/Audio";
import { Embed } from "./blocks/Embed";
import { Hosts } from "./collections/Hosts";
import { absoluteUrl, searchIndexAccess, seoDescription, seoTitle } from "./lib/seo";
import { Media } from "./collections/Media";
import { Posts } from "./collections/Posts";
import { Shows } from "./collections/Shows";
import { Tags } from "./collections/Tags";
import { Users } from "./collections/Users";
import { OAuth2Plugin } from "payload-oauth2";
import { googleOAuth } from "./lib/auth/google";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    components: { beforeLogin: ["/components/admin/GoogleSignIn#GoogleSignIn"] },
  },
  // Users last: payload-oauth2 moves it last when Google is configured; same order either way keeps types stable.
  collections: [Posts, Tags, Shows, Hosts, Media, Users],
  globals: [CdsSyncStatus],
  // Embed (players, social posts) and Audio (MP3) blocks inside story text.
  editor: lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [Embed, Audio] })] }),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  // DATABASE_URL is the pooled Neon URL the Vercel marketplace integration sets.
  // push: false — schema changes go through `payload migrate:create` + `migrate`, never dev auto-push,
  // so the dev server can't drift the shared Neon database away from the committed migrations.
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL || "" }, push: false }),
  sharp,
  plugins: [
    // Search title, description and share image on every post; defaults come from the post itself.
    seoPlugin({
      collections: ["posts"],
      uploadsCollection: "media",
      generateTitle: ({ doc }) => seoTitle(doc as { title: string }),
      generateDescription: ({ doc }) => seoDescription(doc as { excerpt?: string | null }),
      generateURL: ({ doc }) => {
        const d = doc as { category?: "music" | "culture" | "milwaukee"; slug?: string };
        return d.category && d.slug ? absoluteUrl({ category: d.category, slug: d.slug }) : "";
      },
    }),
    // One index for admin search now and public site search later. Editors-only until public search is built.
    searchPlugin({ collections: ["posts"], searchOverrides: { access: searchIndexAccess } }),
    adminSearchPlugin({}),
    // Grid view with lightbox and bulk upload for the 2,700+ images.
    mediaGalleryPlugin({ collectionSlug: "media" }),
    redirectsPlugin({ collections: ["posts"] }),
    // Editors' uploads go browser -> Blob directly (Vercel caps server request bodies at 4.5 MB).
    // disablePayloadAccessControl: image URLs point straight at the public Blob CDN, no Payload hop per image.
    // Sign in with Google (Workspace staff only); off until GOOGLE_OAUTH_CLIENT_ID/SECRET are set.
    OAuth2Plugin(googleOAuth()),
    vercelBlobStorage({ collections: { media: { disablePayloadAccessControl: true } }, token: process.env.BLOB_READ_WRITE_TOKEN, clientUploads: true }),
  ],
});
