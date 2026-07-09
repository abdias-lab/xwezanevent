/** @type {import('next').NextConfig} */

// En local (mémoire contrainte) on limite le parallélisme des workers de build
// pour éviter les crashes OOM. Sur Vercel, on laisse le build à pleine vitesse.
const surVercel = process.env.VERCEL === "1";

const nextConfig = {
  images: {
    // Autorise next/image à optimiser les affiches hébergées ailleurs
    // (URL d'affiche saisie par les organisateurs).
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  ...(surVercel
    ? {}
    : { experimental: { workerThreads: false, cpus: 1 } }),
};

export default nextConfig;
