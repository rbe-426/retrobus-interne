import { useEffect } from "react";

export const RETROMAIL_URL = "https://www.retrobus-interne.fr/auth/rmail/login";

export default function ExternalRetromailRedirect() {
  useEffect(() => {
    const retromailWindow = window.open(RETROMAIL_URL, "_blank", "noopener,noreferrer");

    if (retromailWindow) {
      window.location.replace("/dashboard");
      return;
    }

    window.location.replace(RETROMAIL_URL);
  }, []);

  return null;
}