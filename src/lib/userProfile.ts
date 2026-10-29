import { useState, useEffect, useCallback } from "react";
import { DEFAULT_PROFILE, readUserProfile, writeUserProfile, type UserProfile } from "./profileStore";

// Lecture et écriture du profil : lib/profileStore (sans React, aussi lu par les pages statiques)
export { readUserProfile, writeUserProfile, type UserProfile };

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    setProfile(readUserProfile());
    const handler = (e: Event) => {
      setProfile((e as CustomEvent<UserProfile>).detail);
    };
    window.addEventListener("profile-changed", handler);
    return () => window.removeEventListener("profile-changed", handler);
  }, []);

  const updateProfile = useCallback((newProfile: Partial<UserProfile>) => {
    const current = readUserProfile();
    const next = { ...current, ...newProfile, hasConfigured: true };
    writeUserProfile(next);
    setProfile(next);
  }, []);

  const resetProfile = useCallback(() => {
    writeUserProfile(DEFAULT_PROFILE);
    setProfile(DEFAULT_PROFILE);
  }, []);

  return { profile, updateProfile, resetProfile };
}
