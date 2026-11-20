import Link from "next/link";

/** The admin sidebar's link to Add from NPR (plan 11). */
export function NprNavLink() {
  return (
    <Link href="/admin/npr" className="nav__link" style={{ display: "block", padding: "4px 0" }}>
      Add from NPR
    </Link>
  );
}

/** Above the Posts list: the way in for staff who start there. */
export function AddFromNprButton() {
  return (
    <div className="gutter--left gutter--right" style={{ marginBottom: "var(--base)" }}>
      <Link href="/admin/npr" className="btn btn--style-secondary btn--size-small">Add from NPR</Link>
    </div>
  );
}
