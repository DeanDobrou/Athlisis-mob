const isLetter = (c: string) => c.toLowerCase() !== c.toUpperCase();
const isDigit = (c: string) => c >= "0" && c <= "9";

/** The password rules the server enforces, checked here only to guide the member while typing. */
export function passwordRules(value: string) {
  const chars = [...value];
  return [
    { label: "Τουλάχιστον 8 χαρακτήρες", met: value.length >= 8 },
    {
      label: "Ένα κεφαλαίο γράμμα",
      met: chars.some((c) => isLetter(c) && c === c.toUpperCase()),
    },
    { label: "Έναν αριθμό", met: chars.some(isDigit) },
    {
      label: "Ένα σύμβολο",
      met: chars.some((c) => c.trim() !== "" && !isLetter(c) && !isDigit(c)),
    },
  ];
}
