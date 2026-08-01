/**
 * Unit tests for buildVoiceDescription in lib/presets.ts.
 *
 * Run: npx tsx --test lib/__tests__/voice-description.test.ts
 */

import { describe, it } from "node:test"
import assert from "node:assert"
import { buildVoiceDescription } from "../presets"

describe("buildVoiceDescription", () => {
  it("prepends a male prompt when gender is male and the instruction omits it", () => {
    assert.strictEqual(
      buildVoiceDescription("A calm, steady voice for training content.", "male"),
      "Speak with a male voice. A calm, steady voice for training content.",
    )
  })

  it("prepends a female prompt when gender is female and the instruction omits it", () => {
    assert.strictEqual(
      buildVoiceDescription("A calm, steady voice for training content.", "female"),
      "Speak with a female voice. A calm, steady voice for training content.",
    )
  })

  it("leaves the instruction unchanged when it already mentions the gender word", () => {
    const instruction = "A calm, professional male voice with clear enunciation."
    assert.strictEqual(buildVoiceDescription(instruction, "male"), instruction)
  })

  it("leaves the instruction unchanged for neutral gender", () => {
    const instruction = "A gentle, measured voice."
    assert.strictEqual(buildVoiceDescription(instruction, "neutral"), instruction)
  })

  it("leaves the instruction unchanged for null gender", () => {
    const instruction = "A gentle, measured voice."
    assert.strictEqual(buildVoiceDescription(instruction, null), instruction)
  })

  it("returns just the gender prompt when the instruction is empty", () => {
    assert.strictEqual(buildVoiceDescription("", "female"), "Speak with a female voice.")
  })

  it("returns the fallback when both instruction and gender are empty", () => {
    assert.strictEqual(
      buildVoiceDescription(null, null),
      "Natural, clear, professional speaking voice",
    )
  })

  it("uses the provided fallback when both instruction and gender are empty", () => {
    assert.strictEqual(
      buildVoiceDescription(null, null, "Custom fallback"),
      "Custom fallback",
    )
  })
})
