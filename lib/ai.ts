export type EmailCategory =
  | "Interested"
  | "Meeting Booked"
  | "Not Interested"
  | "Spam"
  | "Out of Office"
  | "Uncategorized";

const rules: { category: EmailCategory; keywords: string[] }[] = [
  {
    category: "Interested",
    keywords: [
      "interested",
      "let's talk",
      "tell me more",
      "what are the next steps",
    ],
  },
  {
    category: "Meeting Booked",
    keywords: [
      "meeting booked",
      "meeting scheduled",
      "call booked",
      "appointment confirmed",
    ],
  },
  {
    category: "Not Interested",
    keywords: [
      "not interested",
      "unsubscribe",
      "not a good fit",
      "remove me from your list",
    ],
  },
  {
    category: "Spam",
    keywords: ["viagra", "lottery", "free money", "prince"],
  },
  {
    category: "Out of Office",
    keywords: [
      "out of office",
      "on vacation",
      "away from my desk",
      "auto-reply",
    ],
  },
];

export const categorizeEmail = (email: {
  subject?: string;
  text?: string;
}): EmailCategory => {
  const subject = email.subject?.toLowerCase() || "";
  const body = email.text?.toLowerCase() || "";

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (subject.includes(keyword) || body.includes(keyword)) {
        return rule.category;
      }
    }
  }

  return "Uncategorized";
};
