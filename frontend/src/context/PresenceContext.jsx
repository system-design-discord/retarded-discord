import { createContext } from 'react';

// Who is online, and when somebody's profile last changed.
//
// **Both facts arrive on the notification socket, and neither has one of its
// own.** `/ws/notifications/` is the only connection the SPA holds open on
// *every* screen — a conversation socket comes and goes with the route — so it
// is the only place either of these could be delivered without opening a second
// connection per tab. `NotificationsContext` keeps owning that socket and feeds
// this provider; splitting the *state* in two while keeping one socket is what
// stops `useNotifications` from growing two unrelated concerns.
//
// **Presence is a set of ids and nothing more.** The server sends a snapshot on
// connect and an increment per change, so the client never polls and never has
// to reconcile — a reconnect replaces the set outright, which is what makes a
// dropped connection lose nothing.
//
// **Profile changes are a version counter, not a patch.** The alternative was a
// `{id: {username, avatar}}` override map consulted at every render site, which
// would mean touching every component that draws a person and leaving each of
// them holding a second, client-derived truth beside the server's. A counter
// instead: four hooks include it in their dependencies and re-read, so what
// ends up on screen is always what the API says. It is deliberately *not* keyed
// by user id — a list does not know which of its rows belongs to whom without
// looking, and looking is the re-read.

const PresenceContext = createContext(null);

export default PresenceContext;
