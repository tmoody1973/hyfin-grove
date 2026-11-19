/** Ticket links come from Ticketmaster/AXS via rm-playlist; only web links become buttons. */
export const safeTicketUrl = (url: string | null): string | null => (url && /^https?:\/\//i.test(url) ? url : null);

export const eventPath = (id: string): string => `/events/${encodeURIComponent(id)}`;
