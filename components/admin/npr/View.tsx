import { DefaultTemplate } from "@payloadcms/next/templates";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";
import { Picker } from "./Picker";

/** Admin → Add from NPR, at /admin/npr (plan 11, task 3). Signed-in staff only. */
export function NprPickerView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  if (!req.user) redirect("/admin/login?redirect=%2Fadmin%2Fnpr");
  return (
    <DefaultTemplate
      i18n={req.i18n as never}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      <Picker />
    </DefaultTemplate>
  );
}
