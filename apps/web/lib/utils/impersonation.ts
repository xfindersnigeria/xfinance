const IMPERSONATED_GROUP_COOKIE = "xf_impersonated_group_id";
const IMPERSONATED_ENTITY_COOKIE = "xf_impersonated_entity_id";

function setClientCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function clearClientCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function getClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.split("=").slice(1).join("="));
}

export function getClientImpersonationHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const groupId = getClientCookie(IMPERSONATED_GROUP_COOKIE);
  const entityId = getClientCookie(IMPERSONATED_ENTITY_COOKIE);

  if (groupId) {
    headers["X-Impersonate-Group"] = groupId;
  }

  if (entityId) {
    headers["X-Impersonate-Entity"] = entityId;
  }

  return headers;
}

export function setImpersonatedGroupCookie(groupId: string) {
  setClientCookie(IMPERSONATED_GROUP_COOKIE, groupId);
}

export function clearImpersonatedGroupCookie() {
  clearClientCookie(IMPERSONATED_GROUP_COOKIE);
}

export function setImpersonatedEntityCookie(entityId: string) {
  setClientCookie(IMPERSONATED_ENTITY_COOKIE, entityId);
}

export function clearImpersonatedEntityCookie() {
  clearClientCookie(IMPERSONATED_ENTITY_COOKIE);
}

export const IMPERSONATION_COOKIE_NAMES = {
  group: IMPERSONATED_GROUP_COOKIE,
  entity: IMPERSONATED_ENTITY_COOKIE,
};