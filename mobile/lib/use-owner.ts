import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { vault, type OwnerDetails } from "./vault";

const EMPTY: OwnerDetails = { name: "", email: "", phone: "", address: "" };

/**
 * The claimant details saved in the vault. There is no account, so this is
 * what the avatar initial and the claim paperwork are drawn from.
 */
export function useOwner(): OwnerDetails {
  const [owner, setOwner] = useState<OwnerDetails>(EMPTY);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      vault
        .settings()
        .then((s) => {
          if (alive) setOwner(s.owner);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [])
  );

  return owner;
}
