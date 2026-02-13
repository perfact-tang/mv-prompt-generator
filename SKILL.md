---
name: mv-prompt-generator
description: Automates the generation of detailed Wan2.2 video prompts for Music Videos (MVs). Uses a shooting proposal and lyrics to create a scene-by-scene prompt list, handling 5-second segmentation and visual continuity. Use this when the user wants to generate AI video prompts from a script or lyrics.
---

# MV Prompt Generator Skill

This skill helps you generate a complete JSON manifest of video prompts for an AI Music Video, specifically optimized for the **Wan2.2** model. It handles the 5-second generation limit by breaking down scenes and ensuring visual continuity.

## Prerequisites

You need two input files:
1.  **Lyrics File (.lrc)**: Standard LRC format with timestamps.
2.  **Shooting Proposal (.json)**: A JSON file defining the storyboard segments, styles, and time ranges. (See `assets/proposal_template.json` if you need a template, or ask the user for their proposal).

## Workflow

### Step 1: Generate Structure
First, run the helper script to segment the timeline into 5-second chunks and map the lyrics.

```bash
node scripts/structure_generator.js <path_to_lrc> <path_to_proposal> <output_path>
```
*Example:* `node scripts/structure_generator.js song.lrc proposal.json structure_draft.json`

### Step 2: Generate Prompts (The Creative Step)
Once the `structure_draft.json` is created, you (the Agent) must read it and fill in the `image_prompt` and `video_prompt` fields for each segment.

**Read the Reference Guide First:**
Review [Wan2.2 Guide](references/wan22_guide.md) for the specific prompt formula:
`Prompt = Subject + Scene + Motion + Aesthetic + Style`

**Prompt Generation Logic:**

1.  **Analyze the Segment**:
    *   Check `type`:
        *   `New_Scene`: Requires a **T2I (Text-to-Image)** prompt first to establish the look, then an **I2V (Image-to-Video)** prompt.
        *   `Last_Frame_Continuity`: Only requires an **I2V** prompt. It *must* implicitly reference the previous 5s clip's end state (though in the prompt text, you describe the *current* action continuing from the previous).
    *   Check `lyrics`: Let the lyrics inspire the emotion and specific actions.
    *   Check `storyboard.basics`: Ensure the global style (Lighting, Art Style) is applied to every prompt.

2.  **Iterative Filling**:
    *   Read the `structure_draft.json`.
    *   Process the `mvinfo` array in batches (e.g., 5-10 items at a time) to avoid context limits.
    *   For each item, generate the detailed English prompts.
    *   **CRITICAL**: Ensure consistency. If Segment 1 introduces a "Girl in a red coat", Segment 2 (Continuity) must also mention "Girl in a red coat" to help the AI model maintain identity, even if using Image-to-Video.

3.  **Output**:
    *   Update the JSON file with the generated prompts.
    *   Present the final JSON to the user.

## Example Output Format

```json
{
  "timestamp": "00:00 - 00:05",
  "type": "New_Scene",
  "lyrics": "The rain falls...",
  "image_prompt": "Cinematic shot, medium close-up, a girl in a red raincoat standing under neon lights, rain streaks on camera, cyberpunk city background, melancholic expression, 8k resolution, Wong Kar-wai style.",
  "video_prompt": "Slow zoom in, the girl looks up at the sky, rain falling heavily, neon lights flickering in background, high quality, smooth motion."
}
```
