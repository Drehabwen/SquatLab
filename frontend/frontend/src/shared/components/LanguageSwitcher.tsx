import { useTranslation } from "react-i18next";
import { Button } from "./ui";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;

  return (
    <div className={`language-switcher ${className}`}>
      <Button
        variant={currentLanguage === "zh-CN" ? "primary" : "tertiary"}
        size="small"
        onClick={() => changeLanguage("zh-CN")}
        className="language-button"
      >
        中文
      </Button>
      <Button
        variant={currentLanguage === "en-US" ? "primary" : "tertiary"}
        size="small"
        onClick={() => changeLanguage("en-US")}
        className="language-button"
      >
        English
      </Button>
    </div>
  );
}
