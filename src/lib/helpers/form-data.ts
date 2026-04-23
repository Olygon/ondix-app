export function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export function getFormFile(formData: FormData, key: string) {
  const value = formData.get(key);

  return value instanceof File ? value : null;
}

export function getCheckboxValue(formData: FormData, key: string) {
  return getFormValue(formData, key) === "on";
}

export function getBooleanValue(formData: FormData, key: string) {
  return getFormValue(formData, key) === "true";
}
