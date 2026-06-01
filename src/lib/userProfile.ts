import { useState, useEffect, useCallback } from "react";
import type { UserProfileType } from "./cee";

export interface UserProfile {
  profileType: UserProfileType;
  householdSize: number;
  taxIncome: number;
  hasConfigured: boolean;
}

const STORAGE_KEY = "evly-user-profile";

const DEFAULT_PROFILE: UserProfile = {
  profileType: "particular",
  householdSize: 1,
  taxIncome: 24000,
  hasConfigured: false,
};

export function readUserProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function writeUserProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("profile-changed", { detail: profile }));
}

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
