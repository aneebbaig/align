/** The HTML `lang` that makes native date inputs follow the household's date format setting. */
export function dateFormatToLang(fmt: string): string {
  if (fmt.startsWith("MM/dd")) return "en-US";
  if (fmt.startsWith("yyyy")) return "sv";
  return "en-GB";
}
