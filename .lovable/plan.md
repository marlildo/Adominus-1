
## Plan: Real Camera Scanner with Gemini Vision AI

### What the user wants
When clicking "Escanear Refeição", the device camera (phone, tablet, or laptop webcam) opens to take a real photo. That photo is sent to Gemini Vision AI, which analyzes the food items, estimates portions, and returns a complete nutritional breakdown — just like the reference app shown.

### Current state
- The scanner button (`simulateScan`) runs a fake 2.5-second delay and returns hardcoded mock data
- The `fileRef` input exists but is never triggered — it calls `simulateScan()` instead of real analysis
- The `nutrition-ai` edge function only accepts a text `description` field, not images

### What will be built

#### 1. Update `supabase/functions/nutrition-ai/index.ts`
Add a new code path for image-based analysis:
- Accept `imageBase64` (string) and `mimeType` (string) in the request body alongside the existing `description`
- When `imageBase64` is present, send a **multimodal message** to Gemini with both the image and a prompt asking it to identify all food items, estimate portion sizes, and return full nutritional data using the existing `analyze_nutrition` tool call structure
- The system prompt for vision mode will be specialized: "You are a nutrition expert analyzing a photo of a meal..."

#### 2. Update `src/pages/NutritionIntelligence.tsx` — Scanner section
Replace the simulated scanner with a real camera flow:

**New state variables:**
- `cameraStream` — holds the active MediaStream
- `isScanningImage` — loading state while AI processes
- `scanPreviewUrl` — base64 data URL of the captured/selected image
- `showCamera` — whether the live camera view is open

**New flow (3 modes — mobile & desktop):**
1. User clicks "Escanear Refeição"
2. A modal/overlay opens with two options:
   - **Câmera ao vivo** — opens `getUserMedia({ video: true })`, shows live video feed, button to snap photo
   - **Escolher da galeria** — triggers `<input type="file" accept="image/*" capture="environment">`
3. On capture/select: the image is shown as a preview with a spinner "Analisando com IA..."
4. Image is converted to base64 and sent to the updated `nutrition-ai` edge function
5. Real Gemini Vision analysis result is displayed exactly like the text analysis result (items list + macros)
6. "Adicionar ao diário" button adds the meal

**Camera modal design** (matches Adominus glass UI):
- Dark overlay
- Camera viewfinder with corner brackets (like the reference image)
- Bottom action bar with: `[📷 Escanear]` `[🖼️ Galeria]` buttons
- `[X]` close button top-left

#### 3. Technical details
```
nutrition-ai edge function request body:
  { description: string }  ← existing text flow (unchanged)
  { imageBase64: string, mimeType: string }  ← new image flow

Gemini Vision call:
  model: "google/gemini-2.5-pro"  (best multimodal vision)
  messages: [
    { role: "system", content: vision system prompt },
    { role: "user", content: [
      { type: "image_url", image_url: { url: "data:{mimeType};base64,{imageBase64}" } },
      { type: "text", text: "Analyze this meal photo..." }
    ]}
  ]
  tools: [ analyze_nutrition function ] ← same tool as text flow
```

The `fileRef` input will use `capture="environment"` so on mobile it directly opens the rear camera. On desktop it opens the file picker.

### Files to change
1. `supabase/functions/nutrition-ai/index.ts` — add image multimodal path
2. `src/pages/NutritionIntelligence.tsx` — replace `simulateScan` with real camera/upload + modal UI
