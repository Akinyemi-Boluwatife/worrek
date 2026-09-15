import { z } from "zod";

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((value) => value || undefined);

export const joinWaitlistSchema = z.object({
  firstName: z.string().trim().min(1).max(100),

  lastName: optionalTrimmedString(100),

  email: z.string().trim().toLowerCase().max(255).pipe(z.email()),

  referralPlatform: optionalTrimmedString(100),

  marketingConsent: z.boolean().default(false),
});

export type JoinWaitlistInput = z.input<typeof joinWaitlistSchema>;
export type JoinWaitlistData = z.output<typeof joinWaitlistSchema>;
