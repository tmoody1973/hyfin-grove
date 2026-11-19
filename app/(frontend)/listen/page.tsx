import { redirect } from "next/navigation";

/** /listen has no page of its own yet; the playlist is the front door. */
export default function ListenPage() {
  redirect("/listen/playlist");
}
