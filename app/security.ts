/** Permit an OAuth form redirect only to the registered client's return origin. */
export function contentSecurityPolicy(approvedReturnOrigin?: string) {
  return `default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; script-src 'none'; base-uri 'none'; form-action 'self'${approvedReturnOrigin ? ` ${approvedReturnOrigin}` : ""}; frame-ancestors 'none'`;
}
