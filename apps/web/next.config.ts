import type { NextConfig } from "next";

// Antetele stricte (HSTS, interzicerea încadrării) doar pentru platforma publicată pe HTTPS.
const httpsDeployment = (process.env.APP_URL ?? "").startsWith("https://");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Native / Node-only packages must not be bundled.
  serverExternalPackages: ["@node-rs/argon2", "@node-saml/node-saml"],
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (httpsDeployment) {
      security.push({ key: "X-Frame-Options", value: "DENY" });
      security.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    return [{ source: "/:path*", headers: security }];
  },
};

export default nextConfig;
