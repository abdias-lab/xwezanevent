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
  experimental: {
    // Par défaut Next limite le corps des Server Actions à 1 Mo : trop
    // petit pour l'upload d'affiche (5 Mo max + marge multipart).
    serverActions: { bodySizeLimit: "6mb" },
    ...(surVercel ? {} : { workerThreads: false, cpus: 1 }),
  },
};

export default nextConfig;
