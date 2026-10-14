import * as fs from "fs";
import * as path from "path";

const root = path.join(__dirname, "..", "..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const changelog = fs.readFileSync(path.join(root, "changelog.md"), "utf8");

const readmeNeedles: [string, string][] = [
  ["a SECTION example", "{{SECTION"],
  ["the SECTION end tag", "{{END_SECTION}}"],
  ["a FENCE example", "{{FENCE"],
  ["the FENCE end tag", "{{END_FENCE}}"],
  ["RAW", "{{RAW}}"],
  ["the RAW end tag", "{{END_RAW}}"],
  ["heading_offset", "heading_offset"],
  ["the block escape mode", "escape_md=block"],
  ["the inline escape mode", "escape_md=inline"],
  ["the whitespace rule", "standalone"],
  ["the trim marker before a tag", "{{-"],
  ["the trim marker after a tag", "-}}"],
  ["the API option", "standaloneLines"],
  ["the CLI flag", "--no-standalone-lines"],
  ["the CLI opt-in flag", "--standalone-lines"],
  ["the node option label", "Remove Standalone Tag Lines"],
  ["skip_empty", "skip_empty"],
];

describe("sf-docs: README documents the prompt-aware constructs", () => {
  it.each(readmeNeedles)("sf-docs: README documents %s", (_label, needle) => {
    expect(readme).toContain(needle);
  });

  it("sf-docs: the README describes the standalone option on the API, the CLI and the node", () => {
    const api = /options[^\n]*standaloneLines|standaloneLines[^\n]*options/i;
    expect(readme).toMatch(api);
    expect(readme).toMatch(/--no-standalone-lines[\s\S]*Remove Standalone Tag Lines|Remove Standalone Tag Lines[\s\S]*--no-standalone-lines/);
  });

  it("sf-docs: the README explains that a backslash before the brace pair outputs it literally", () => {
    const lines = readme.split("\n").filter((l) => l.includes(String.fromCharCode(92) + "{{"));
    expect(lines.some((l) => /literal|escape/i.test(l))).toBe(true);
  });

  it("sf-docs: the changelog mentions SECTION and FENCE", () => {
    expect(changelog).toContain("SECTION");
    expect(changelog).toContain("FENCE");
  });
});
