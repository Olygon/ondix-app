"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useId, useState } from "react";

import { Input } from "@/components/ui/input";

type PasswordFieldProps = {
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  inputClassName?: string;
  label: string;
  name: string;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
};

export function PasswordField({
  autoComplete,
  defaultValue,
  error,
  inputClassName,
  label,
  name,
  onChange,
  placeholder,
  value,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const fieldId = useId();

  return (
    <label className="flex flex-col gap-2" htmlFor={fieldId}>
      <span className="text-[12px] font-medium text-foreground">{label}</span>

      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={fieldId}
          name={name}
          type={isVisible ? "text" : "password"}
          defaultValue={defaultValue}
          value={value}
          autoComplete={autoComplete}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          placeholder={placeholder}
          className={inputClassName ? `pl-10 pr-11 ${inputClassName}` : "pl-10 pr-11"}
        />

        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted-foreground transition-colors duration-150 hover:text-primary"
          aria-label={isVisible ? "Ocultar senha" : "Exibir senha"}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error ? (
        <span className="text-xs font-semibold text-red-600 dark:text-red-300">
          {error}
        </span>
      ) : null}
    </label>
  );
}
