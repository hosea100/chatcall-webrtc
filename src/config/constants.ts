export const baseURL =
  process.env.NEXT_PUBLIC_ENV_BASEURL === "PRODUCTION"
    ? "https://mfkwnj6b-4000.asse.devtunnels.ms"
    : "http://localhost:4000";
