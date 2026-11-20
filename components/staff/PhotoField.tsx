"use client";

import { useRef, useState } from "react";
import { shrinkPhoto } from "./shrinkPhoto";

const INPUT = "min-h-12 border border-white bg-black px-3 font-body text-[17px] normal-case tracking-normal text-white focus:border-[#00ff9f] focus:outline-none";

/** Optional event photo: shrunk in the browser before upload, with a required short description once chosen. */
export function PhotoField({ error, onBusy }: { error?: string; onBusy: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    setNote(null);
    setPreview(null);
    if (!picked) return;
    onBusy(true);
    try {
      const small = await shrinkPhoto(picked);
      const dt = new DataTransfer();
      dt.items.add(small);
      if (input.current) input.current.files = dt.files;
      setPreview(URL.createObjectURL(small));
    } catch {
      if (input.current) input.current.value = "";
      setNote("Couldn't read that photo. Try a JPEG or PNG.");
    } finally {
      onBusy(false);
    }
  }

  return (
    <fieldset className="flex flex-col gap-3 border border-white/40 p-4">
      <legend className="px-1 font-mono text-xs uppercase tracking-[0.1em]">Photo (optional)</legend>
      <input ref={input} id="photo" name="photo" type="file" accept="image/*" onChange={choose} className="font-mono text-sm file:mr-3 file:border file:border-white file:bg-black file:px-3 file:py-2 file:font-mono file:text-xs file:uppercase file:text-white" aria-describedby={error || note ? "photo-error" : undefined} />
      {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the shrunk file */}
      {preview && <img src={preview} alt="" className="max-h-56 w-auto self-start border border-white" />}
      {preview && (
        <label htmlFor="photoAlt" className="flex flex-col gap-2 font-mono text-xs uppercase tracking-[0.1em]">
          Describe the photo
          <input id="photoAlt" name="photoAlt" required maxLength={200} placeholder="e.g. Dancers at Bounce Milwaukee" className={INPUT} />
        </label>
      )}
      {(error || note) && <span id="photo-error" className="font-body text-sm text-[#ff0040]">{error ?? note}</span>}
    </fieldset>
  );
}
