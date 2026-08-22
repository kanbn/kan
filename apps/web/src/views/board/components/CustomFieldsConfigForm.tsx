import { t } from "@lingui/core/macro";
import { dump } from "js-yaml";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HiOutlineQuestionMarkCircle, HiXMark } from "react-icons/hi2";

import {
  type CustomFieldsConfig,
  parseCustomFieldsConfig,
} from "@kan/shared";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

import {
  CustomFieldsSimpleList,
  type FieldLocation,
  type SimpleFieldUI,
} from "./CustomFieldsSimpleList";

function isConfigTooComplex(config: CustomFieldsConfig): boolean {
  // Check if there are top-level sections other than main and sidebar
  const hasCustomSections = Object.keys(config).some(
    (k) => k !== "main" && k !== "sidebar",
  );
  if (hasCustomSections) return true;

  // Check if any field is overly complex (is a section, has fields, timeseries, etc)
  const isComplexField = (field: any) => {
    if (!field) return false;
    if (field.type === "section" || field.type === "timeseries" || field.type === "keyvalue")
      return true;
    if (field.fields) return true;
    return false;
  };

  const mainFields = config.main?.fields || {};
  if (Object.values(mainFields).some(isComplexField)) return true;

  const sidebarFields = config.sidebar?.fields || {};
  if (Object.values(sidebarFields).some(isComplexField)) return true;

  return false;
}

function yamlToSimpleFields(yaml: string): SimpleFieldUI[] {
  if (!yaml.trim()) return [];
  try {
    const config = parseCustomFieldsConfig(yaml);
    const fields: SimpleFieldUI[] = [];

    const addFields = (
      sectionFields: Record<string, any>,
      location: FieldLocation,
    ) => {
      Object.entries(sectionFields).forEach(([key, field]) => {
        let optionsStr = "";
        if (field.type === "select" && field.options) {
          optionsStr = Object.values(field.options).join(", ");
        }

        fields.push({
          id: Math.random().toString(36).substring(7),
          key,
          title: field.title || key,
          type: field.type || "text",
          location,
          showOnBoard: !!field.showOnBoard,
          options: optionsStr,
        });
      });
    };

    if (config.main?.fields) {
      addFields(config.main.fields, "main");
    }
    if (config.sidebar?.fields) {
      addFields(config.sidebar.fields, "sidebar");
    }

    return fields;
  } catch {
    return [];
  }
}

function simpleFieldsToYaml(fields: SimpleFieldUI[]): string {
  if (fields.length === 0) return "";

  const config: any = {
    main: { fields: {} },
    sidebar: { fields: {} },
  };

  fields.forEach((field) => {
    if (!field.title.trim()) return;

    let optionsRecord: Record<string, string> | undefined = undefined;
    if (field.type === "select" && field.options) {
      optionsRecord = {};
      field.options.split(",").forEach((opt) => {
        const val = opt.trim();
        if (val) {
          // generate a naive key
          const key = val
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/^_+|_+$/g, "") || "opt";
          optionsRecord![key] = val;
        }
      });
    }

    config[field.location].fields[field.key] = {
      title: field.title || field.key,
      type: field.type,
      ...(field.showOnBoard ? { showOnBoard: true } : {}),
      ...(optionsRecord && Object.keys(optionsRecord).length > 0
        ? { options: optionsRecord }
        : {}),
    };
  });

  if (Object.keys(config.main.fields).length === 0) delete config.main;
  if (Object.keys(config.sidebar.fields).length === 0) delete config.sidebar;

  return dump(config, { skipInvalid: true });
}

interface Props {
  boardPublicId: string;
  currentConfig: string | null;
}

export function CustomFieldsConfigForm({ boardPublicId, currentConfig }: Props) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [yaml, setYaml] = useState(currentConfig ?? "");
  const [parseError, setParseError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"simple" | "advanced">("simple");
  const [simpleFields, setSimpleFields] = useState<SimpleFieldUI[]>([]);
  const [isTooComplex, setIsTooComplex] = useState(false);

  useEffect(() => {
    // Initial parse to check complexity and populate simple fields
    if (currentConfig?.trim()) {
      try {
        const config = parseCustomFieldsConfig(currentConfig);
        if (isConfigTooComplex(config)) {
          setIsTooComplex(true);
          setViewMode("advanced");
        } else {
          setSimpleFields(yamlToSimpleFields(currentConfig));
        }
      } catch {
        // If it doesn't even parse, default to advanced
        setIsTooComplex(true);
        setViewMode("advanced");
      }
    }
  }, [currentConfig]);

  useEffect(() => {
    if (viewMode === "advanced") {
      textareaRef.current?.focus();
    }
  }, [viewMode]);

  const handleSimpleFieldsChange = (newFields: SimpleFieldUI[]) => {
    setSimpleFields(newFields);
    const newYaml = simpleFieldsToYaml(newFields);
    setYaml(newYaml);
    setParseError(null);
  };

  const handleYamlChange = (value: string) => {
    setYaml(value);
    if (!value.trim()) {
      setParseError(null);
      setIsTooComplex(false);
      return;
    }
    try {
      const config = parseCustomFieldsConfig(value);
      setParseError(null);
      setIsTooComplex(isConfigTooComplex(config));
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  const switchMode = (mode: "simple" | "advanced") => {
    if (mode === "advanced") {
      // Simple -> Advanced: generate YAML from existing simple fields is already done via handleSimpleFieldsChange
      setViewMode("advanced");
    } else {
      // Advanced -> Simple
      if (parseError || isTooComplex) return;
      setSimpleFields(yamlToSimpleFields(yaml));
      setViewMode("simple");
    }
  };

  const updateBoard = api.board.update.useMutation({
    onSuccess: () => {
      showPopup({
        header: t`Custom fields saved`,
        message: t`The custom fields configuration has been saved.`,
        icon: "success",
      });
      void utils.board.byId.invalidate();
      closeModal();
    },
    onError: (err) => {
      showPopup({
        header: t`Unable to save custom fields`,
        message: err.message ?? t`Please try again later.`,
        icon: "error",
      });
    },
  });

  const handleSave = () => {
    if (parseError) return;

    updateBoard.mutate({
      boardPublicId,
      customFieldsConfig: yaml.trim() || null,
    });
  };

  const isValid = viewMode === "simple" || (!parseError);
  const isDirty = yaml.trim() !== (currentConfig ?? "").trim();

  return (
    <div className="flex flex-col w-full">
      <div className="px-5 pt-5 pb-2">
        <div className="flex w-full items-center justify-between pb-4">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
              {t`Custom Fields`}
            </h2>
            <Link
              href="https://docs.kan.bn/custom-fields"
              target="_blank"
              rel="noreferrer"
              className="text-neutral-400 hover:text-neutral-600 dark:text-dark-800 dark:hover:text-dark-900"
            >
              <HiOutlineQuestionMarkCircle className="h-4 w-4" />
            </Link>
          </div>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300"
            onClick={closeModal}
          >
            <HiXMark className="h-[16px] w-[16px] text-neutral-600 dark:text-dark-900" />
          </button>
        </div>

        <div className="flex border-b border-light-600 dark:border-dark-600 mb-4">
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold focus:outline-none ${
              viewMode === "simple"
                ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "text-neutral-500 hover:text-neutral-700 dark:text-dark-700 dark:hover:text-dark-900"
            } ${isTooComplex ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => switchMode("simple")}
            disabled={isTooComplex || !!parseError}
            title={isTooComplex ? t`Configuration is too complex for simple editor` : ""}
          >
            {t`Simple`}
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold focus:outline-none ${
              viewMode === "advanced"
                ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "text-neutral-500 hover:text-neutral-700 dark:text-dark-700 dark:hover:text-dark-900"
            }`}
            onClick={() => switchMode("advanced")}
          >
            {t`Advanced`}
          </button>
        </div>

        {viewMode === "simple" ? (
          <>
            <p className="mb-3 text-xs text-neutral-500 dark:text-dark-700">
              {t`Define basic custom fields for this board. Switch to Advanced to define sections or write raw YAML.`}
            </p>
            <CustomFieldsSimpleList fields={simpleFields} onChange={handleSimpleFieldsChange} />
          </>
        ) : (
          <>
            <p className="mb-3 text-xs text-neutral-500 dark:text-dark-700">
              {t`Configure custom fields using YAML. Overly complex structures can only be edited here.`}
            </p>

            <textarea
              ref={textareaRef}
              className={`w-full rounded border bg-transparent p-3 font-mono text-xs focus:outline-none ${
                parseError
                  ? "border-red-400 focus:border-red-500"
                  : "border-light-600 focus:border-neutral-400 dark:border-dark-600 dark:focus:border-dark-400"
              } text-neutral-900 dark:text-dark-1000`}
              rows={20}
              value={yaml}
              onChange={(e) => handleYamlChange(e.target.value)}
              placeholder={`# Example:\nmain:\n  fields:\n    description:\n      title: Notes\nsidebar:\n  fields:\n    list:\n      title: Status\n    lastContacted:\n      title: Last Contacted\n      type: date\n      showOnBoard: true`}
              spellCheck={false}
            />

            {parseError && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                {parseError}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-light-600 px-5 py-4 dark:border-dark-600">
        <Button variant="secondary" onClick={closeModal} type="button">
          {t`Cancel`}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!isValid || !isDirty || updateBoard.isPending}
          type="button"
        >
          {updateBoard.isPending ? t`Saving…` : t`Save`}
        </Button>
      </div>
    </div>
  );
}
