import Image from "next/image";
import { RichBody } from "@/components/story/RichBody";
import { FormRenderer } from "@/components/forms/FormRenderer";
import type { FormField } from "@/lib/forms/submit";
import type { Form, Media, Page } from "@/payload-types";

type RichData = Parameters<typeof RichBody>[0]["data"];

/** The page's form (Admin → Forms), with staff's text blocks and thank-you rendered here on the server. */
function PageForm({ form, href }: { form: Form; href: string }) {
  const fields = (form.fields ?? []) as unknown as FormField[];
  const messages = Object.fromEntries(
    fields.flatMap((f, i) => (f.blockType === "message" && f.message ? [[i, <RichBody key={i} data={f.message as RichData} href={href} />]] : [])),
  );
  const confirmation = form.confirmationMessage ? <RichBody data={form.confirmationMessage as RichData} href={href} /> : <p>Thanks, it’s in. We’ll be in touch.</p>;
  return <FormRenderer formId={form.id} fields={fields} submitLabel={form.submitButtonLabel} confirmation={confirmation} messages={messages} />;
}

/** A hyfin.org content page at its old address (The Wiz, Anti-Gala, Milwaukee Made, About…). */
export function ContentPage({ page }: { page: Page }) {
  const hero = typeof page.heroImage === "object" ? (page.heroImage as Media | null) : null;
  return (
    <article>
      <section className="px-[clamp(20px,4vw,60px)] pt-11">
        <h1 className="sg-fx sg-lines mx-auto max-w-[1320px] font-display text-[clamp(40px,6.2vw,92px)] uppercase leading-[0.95] tracking-[-0.02em] [text-wrap:balance]">{page.title}</h1>
      </section>
      {hero?.url && (
        <figure className="mx-auto mt-10 max-w-[1320px] px-[clamp(20px,4vw,60px)]">
          <Image src={hero.url} alt={hero.alt ?? ""} width={hero.width ?? 1440} height={hero.height ?? 810} priority sizes="(min-width: 1440px) 1320px, 100vw" className="w-full border border-white" />
          {(hero.caption || hero.credit) && <figcaption className="mt-2 font-mono text-xs text-ink-soft">{[hero.caption, hero.credit].filter(Boolean).join(" · ")}</figcaption>}
        </figure>
      )}
      <section className="px-[clamp(20px,4vw,60px)] pb-16 pt-10">
        <div className="mx-auto max-w-[1320px]">
          {page.body && <RichBody data={page.body} href={`/${page.slug}`} className="story-body max-w-[720px] text-[19px] leading-[1.6]" />}
          {typeof page.form === "object" && page.form && <div className="mt-10"><PageForm form={page.form} href={`/${page.slug}`} /></div>}
        </div>
      </section>
    </article>
  );
}
