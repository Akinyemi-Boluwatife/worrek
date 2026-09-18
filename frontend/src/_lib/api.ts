"use server";

import { api } from "./apiConstants";

export async function joinWaitlist(
  _previousState: { success: boolean; message: string },
  formData: FormData,
) {
  try {
    const response = await api.joinWaitlist({
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
      referralPlatform: String(formData.get("referralPlatform") ?? "").trim(),
      marketingConsent: formData.get("marketingConsent") === "on",
    });

    if (response.ok) {
      return { success: true, message: "You've joined the waitlist." };
    }

    if (response.status === 409) {
      return {
        success: false,
        message: "This email is already on the waitlist.",
      };
    }

    console.error(`Waitlist API returned ${response.status}.`);
  } catch (error) {
    console.error(
      "Waitlist API request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  return {
    success: false,
    message: "We couldn't join the waitlist right now. Please try again later.",
  };
}
