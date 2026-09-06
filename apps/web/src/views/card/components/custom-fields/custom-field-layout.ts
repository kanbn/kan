export interface CustomFieldLayoutDefinition {
  publicId: string;
  sectionLabel: string | null;
  placement: "main" | "sidebar";
}

export const groupCustomFieldDefinitions = <
  T extends CustomFieldLayoutDefinition,
>(
  definitions: T[],
  placement: T["placement"],
  isVisible: (definition: T) => boolean = () => true,
) =>
  definitions
    .filter(
      (definition) =>
        definition.placement === placement && isVisible(definition),
    )
    .reduce<{ label: string | null; definitions: T[] }[]>(
      (groups, definition) => {
        const previous = groups[groups.length - 1];
        if (previous?.label === definition.sectionLabel) {
          previous.definitions.push(definition);
        } else {
          groups.push({
            label: definition.sectionLabel,
            definitions: [definition],
          });
        }
        return groups;
      },
      [],
    );
