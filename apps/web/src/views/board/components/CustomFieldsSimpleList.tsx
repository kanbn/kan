import { t } from "@lingui/core/macro";
import { HiPlus, HiTrash } from "react-icons/hi2";

import Input from "~/components/Input";
import Toggle from "~/components/Toggle";

export type FieldLocation = "main" | "sidebar";

export interface SimpleFieldUI {
  id: string; // unique client-side id
  key: string;
  title: string;
  type: string;
  location: FieldLocation;
  showOnBoard: boolean;
  options?: string;
}

interface Props {
  fields: SimpleFieldUI[];
  onChange: (fields: SimpleFieldUI[]) => void;
}

export function CustomFieldsSimpleList({ fields, onChange }: Props) {
  const updateField = (id: string, updates: Partial<SimpleFieldUI>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const addField = () => {
    const id = Math.random().toString(36).substring(7);
    onChange([
      ...fields,
      {
        id,
        key: `field_${id}`,
        title: "",
        type: "text",
        location: "main",
        showOnBoard: false,
      },
    ]);
  };

  return (
    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto w-full">
      {fields.length === 0 ? (
        <div className="py-4 text-center text-sm text-neutral-500 dark:text-dark-700">
          {t`No custom fields defined yet.`}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex items-start gap-2 rounded border border-light-300 bg-light-100 p-2 dark:border-dark-400 dark:bg-dark-300"
            >
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={t`Field Title`}
                      value={field.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        let key = field.key;
                        if (!field.key.startsWith("field_") && title.trim()) {
                          key = title
                            .trim()
                            .replace(/[^a-zA-Z0-9 ]/g, "")
                            .replace(/ (([a-zA-Z0-9]))/g, (_, match) =>
                              match.toUpperCase(),
                            )
                            .replace(/^[A-Z]/, (l) => l.toLowerCase());
                        } else if (field.key.startsWith("field_") && title.trim()) {
                          key = title
                            .trim()
                            .replace(/[^a-zA-Z0-9 ]/g, "")
                            .replace(/ (([a-zA-Z0-9]))/g, (_, match) =>
                              match.toUpperCase(),
                            )
                            .replace(/^[A-Z]/, (l) => l.toLowerCase());
                        }
                        if (!key) key = field.key;

                        updateField(field.id, { title, key });
                      }}
                      className="min-h-[30px] !py-1 !text-xs"
                    />
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <select
                      className="block w-full rounded-md border-0 bg-dark-300 bg-white/5 px-2 py-1 text-xs shadow-sm ring-1 ring-inset ring-light-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-light-700 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 h-[30px]"
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, { type: e.target.value })
                      }
                    >
                      <option value="text">{t`Text`}</option>
                      <option value="textarea">{t`Text Area`}</option>
                      <option value="number">{t`Number`}</option>
                      <option value="date">{t`Date`}</option>
                      <option value="tel">{t`Tel`}</option>
                      <option value="select">{t`Select`}</option>
                    </select>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <select
                      className="block w-full rounded-md border-0 bg-dark-300 bg-white/5 px-2 py-1 text-xs shadow-sm ring-1 ring-inset ring-light-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-light-700 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 h-[30px]"
                      value={field.location}
                      onChange={(e) =>
                        updateField(field.id, {
                          location: e.target.value as FieldLocation,
                        })
                      }
                    >
                      <option value="main">{t`Main`}</option>
                      <option value="sidebar">{t`Sidebar`}</option>
                    </select>
                  </div>
                </div>
                {field.type === "select" && (
                  <div className="flex px-1">
                    <Input
                      placeholder={t`Options (comma separated values)`}
                      value={field.options || ""}
                      onChange={(e) =>
                        updateField(field.id, { options: e.target.value })
                      }
                      className="min-h-[30px] !py-1 !text-xs"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between px-1">
                  <Toggle
                    isChecked={field.showOnBoard}
                    onChange={() =>
                      updateField(field.id, { showOnBoard: !field.showOnBoard })
                    }
                    label={t`Show on Board`}
                    labelPosition="after"
                  />
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="rounded p-1 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                    title={t`Remove Field`}
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addField}
        className="flex items-center justify-center gap-1 rounded border border-dashed border-light-400 py-2 text-xs text-neutral-600 transition-colors hover:bg-light-100 dark:border-dark-500 dark:text-dark-800 dark:hover:bg-dark-300"
      >
        <HiPlus className="h-4 w-4" />
        {t`Add Field`}
      </button>
    </div>
  );
}
