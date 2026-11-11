export type Jsonify<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

// The wire shape of a repo result: every Date becomes its ISO string, which
// is what the response DTOs (z.iso.datetime()) validate against.
export const toJson = <T>(value: T) =>
  JSON.parse(JSON.stringify(value)) as Jsonify<T>;
