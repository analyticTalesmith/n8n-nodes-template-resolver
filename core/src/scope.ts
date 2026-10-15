import { TemplateValue, VariableLookup } from "./types";

/**
 * Read one path segment from an object by own property only, so a segment such
 * as `constructor` or `toString` never reads a member the engine supplies
 */
export function readOwn(
  object: object,
  key: string
): TemplateValue | undefined {
  if (!Object.prototype.hasOwnProperty.call(object, key)) return undefined;
  return (object as Record<string, TemplateValue>)[key];
}

/**
 * The caller's data, read in place: it only calls `has` and `get` of the
 * lookup it wraps and never copies it
 */
export class RootScope implements VariableLookup {
  constructor(private readonly data: VariableLookup) {}

  has(name: string): boolean {
    return this.data.has(name);
  }

  get(name: string): TemplateValue | undefined {
    return this.data.get(name);
  }

  /**
   * The names the data holds, for an error message. A Map is read through the
   * built-in method, so an error does not reach for any override of its own.
   */
  names(): string[] {
    return this.data instanceof Map
      ? Array.from(Map.prototype.keys.call(this.data) as Iterable<string>)
      : [];
  }
}

/**
 * One loop's names (the item and the `@` metadata) over a parent scope. A name
 * on the frame shadows the same name further up.
 */
export class Frame implements VariableLookup {
  private readonly entries = new Map<string, TemplateValue>();

  constructor(readonly parent: VariableLookup) {}

  set(name: string, value: TemplateValue): void {
    this.entries.set(name, value);
  }

  has(name: string): boolean {
    return this.entries.has(name) || this.parent.has(name);
  }

  get(name: string): TemplateValue | undefined {
    return this.entries.has(name)
      ? this.entries.get(name)
      : this.parent.get(name);
  }
}
