import { describe, expect, it } from "vitest";
import sampleIdeas from "./ideas-fixture.json";
import { ideasFormat, ideasTool, parseIdeas } from "./ideas-schema";

describe("parseIdeas", () => {
  it("accepts a valid result", () => expect(parseIdeas(sampleIdeas)).toEqual(sampleIdeas));

  it("rejects only one smaller idea", () => {
    expect(parseIdeas({ ...sampleIdeas, smallerIdeas: [sampleIdeas.smallerIdeas[0]] })).toBeNull();
  });

  it("rejects an unknown size", () => {
    expect(parseIdeas({ ...sampleIdeas, bestBet: { ...sampleIdeas.bestBet, size: "huge" } })).toBeNull();
  });

  it("rejects a missing money angle", () => {
    const { moneyAngle: _, ...bestBet } = sampleIdeas.bestBet;
    expect(parseIdeas({ ...sampleIdeas, bestBet })).toBeNull();
  });

  it("rejects an empty title", () => {
    expect(parseIdeas({ ...sampleIdeas, bestBet: { ...sampleIdeas.bestBet, title: "" } })).toBeNull();
  });

  it.each([undefined, "text", null])("rejects %s", (input) => expect(parseIdeas(input)).toBeNull());
});

describe("ideasTool", () => {
  it("is a strict tool whose schema the API accepts", () => {
    expect(ideasTool.name).toBe("recommend_ideas");
    expect(ideasTool.strict).toBe(true);
    expect(ideasTool.input_schema).toMatchObject({ type: "object", additionalProperties: false });
    expect(ideasTool.input_schema.required).toEqual(expect.arrayContaining(["bestBet", "smallerIdeas"]));
    const json = JSON.stringify(ideasTool.input_schema);
    expect(json).toContain('"enum":["small","medium","large"]');
    for (const unsupported of ["$schema", "minLength", "minItems", "maxItems"]) expect(json).not.toContain(unsupported);
  });

  it("shares its schema with the structured-output format", () => {
    expect(ideasFormat).toEqual({ type: "json_schema", schema: ideasTool.input_schema });
  });
});
