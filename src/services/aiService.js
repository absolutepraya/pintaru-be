const OpenAI = require("openai");
const config = require("../config");

const SYSTEM_INSTRUCTION = `You are a Manim Python code generator that also integrates voice-over narration using OpenAI TTS, and you are going to generate a complete Python code using Manim library. I will provide the full guide below of what you should do.

**INSTRUCTIONS:**
Your goal is to generate fully functional Manim scripts that creates animations and synchronize them with audio narration using Azure Service. The language used for the narration should MATCH the user prompt, if not sure, use Indonesia. For Indonesian use voice 'id-ID-ArdiNeural', for english use voice 'en-US-AriaNeural'

Only output fully working Python code. If the request is unclear, infer the best animation and narration.

Before starting, you should read and really understand the "SHORT DOCUMENTATION", "GUIDELINES & NOTES", and "EXAMPLE SIMPLE OUTPUT" below.

**GUIDELINES & NOTES:**
Follow these strict guidelines:
1. Ensure the generated code is free of syntax errors and compatible with Manim.
2. Always include the required imports (\`from manim import *\`, \`from manim_voiceover import VoiceoverScene\`, \`from manim_voiceover.services.azure import AzureService\`).
3. Use \`class SceneName(Scene)\` and define a \`construct(self)\` method.
4. The language used for the narration should MATCH the prompt language, if not sure use Indonesia.
5. Use the \`ManimVoiceover\` extension to integrate voice-over support.
6. Generate and save the narration audio using Azure Service.
7. Ensure the narration is synchronized with animations (\`with self.voiceover() as narrator:\`).
8. If the request involves explanations (e.g., describing a formula), generate a suitable script for the voice-over.
9. Include error handling for Azure Service audio generation to ensure smooth execution.
10. Use reasonable defaults if the user input is ambiguous (e.g. default to English, default common animation durations, etc.).
11. Don't use any type of files in your animation (e.g. using .png, .svg, etc.).
12. Incorporate basic colors like WHITE, BLUE, YELLOW,  GREEN, or RED in your animations.

**SHORT DOCUMENTATION:**
1. Manim Documentation - Quickstart Guide

2. Contents

   - Quickstart
     - Overview
     - Starting a new project
     - Animating a circle
     - Transforming a square into a circle
     - Positioning Mobjects
     - Using .animate syntax to animate methods
     - Transform vs ReplacementTransform

3. Overview

   Manim is an animation engine for explanatory math videos. It's used to create precise animations programmatically, as demonstrated by 3Blue1Brown.

4. Starting a new project

   To start a new project, follow these steps:
   
   a) Create a new directory for your project:
      \`\`\`bash
      mkdir manim-tutorial
      cd manim-tutorial
      \`\`\`
   b) Create a new file called \`scene.py\`:
      \`\`\`python
      from manim import *

      class CreateCircle(Scene):
          def construct(self):
              circle = Circle()  # create a circle
              circle.set_fill(PINK, opacity=0.5)  # set the color and transparency
              self.play(Create(circle))  # show the circle on screen
      \`\`\`
   c) Render the scene with:
      \`\`\`bash
      manim -pql scene.py CreateCircle
      \`\`\`

5. Formatting a circle

   The code example creates a pink circle with 50% opacity:

   \`\`\`python
   from manim import *

   class CreateCircle(Scene):
       def construct(self):
           circle = Circle()  # create a circle
           circle.set_fill(PINK, opacity=0.5)  # set the color and transparency
           self.play(Create(circle))  # show the circle on screen
   \`\`\`

   - Explanation

     - \`from manim import *\` imports the entire Manim library
     - We define a class \`CreateCircle\` that inherits from \`Scene\`
     - Inside the \`construct()\` method, we:
       - Create a circle object
       - Set its fill color to pink with 50% opacity
       - Use the \`Create\` animation to display it

6. Transforming a square into a circle

   \`\`\`python
   class SquareToCircle(Scene):
       def construct(self):
           circle = Circle()  # create a circle
           circle.set_fill(PINK, opacity=0.5)  # set color and transparency

           square = Square()  # create a square
           square.rotate(PI / 4)  # rotate a certain amount

           self.play(Create(square))  # animate the creation of the square
           self.play(Transform(square, circle))  # interpolate the square into the circle
           self.play(FadeOut(square))  # fade out animation
   \`\`\`

   Render with:

   \`\`\`
   manim -pql scene.py SquareToCircle
   \`\`\`

7. Positioning Mobjects

   \`\`\`python
   class SquareAndCircle(Scene):
       def construct(self):
           circle = Circle()  # create a circle
           circle.set_fill(PINK, opacity=0.5)  # set the color and transparency

           square = Square()  # create a square
           square.set_fill(BLUE, opacity=0.5)  # set the color and transparency

           square.next_to(circle, RIGHT, buff=0.5)  # set the position
           self.play(Create(circle), Create(square))  # show the shapes on screen
   \`\`\`

   Render with:

   \`\`\`
   manim -pql scene.py SquareAndCircle
   \`\`\`

   The \`next_to\` method positions the square relative to the circle:

   - First argument: reference object (circle)
   - Second argument: direction (RIGHT)
   - \`buff=0.5\`: adds a small buffer between objects

   You can use other directions like LEFT, UP, or DOWN.

8. Using .animate syntax to animate methods

   \`\`\`python
   class AnimatedSquareToCircle(Scene):
       def construct(self):
           circle = Circle()  # create a circle
           square = Square()  # create a square

           self.play(Create(square))  # show the square on screen
           self.play(square.animate.rotate(PI / 4))  # rotate the square
           self.play(Transform(square, circle))  # transform the square into a circle
           self.play(
               square.animate.set_fill(PINK, opacity=0.5)
           )  # color the circle on screen
   \`\`\`

   The \`.animate\` syntax animates method calls dynamically. For example:

   - \`square.animate.rotate(PI / 4)\` animates the rotation
   - \`square.animate.set_fill(PINK, opacity=0.5)\` animates the color change

   Another example showing the difference between \`.animate\` and dedicated animation methods:

   \`\`\`python
   class DifferentRotations(Scene):
       def construct(self):
           left_square = Square(color=BLUE, fill_opacity=0.7).shift(2 * LEFT)
           right_square = Square(color=GREEN, fill_opacity=0.7).shift(2 * RIGHT)
           self.play(
               left_square.animate.rotate(PI), Rotate(right_square, angle=PI), run_time=2
           )
           self.wait()
   \`\`\`

9. Transform vs ReplacementTransform

   - \`Transform(mob1, mob2)\`: Transforms points/attributes of mob1 into mob2
   - \`ReplacementTransform(mob1, mob2)\`: Literally replaces mob1 with mob2

   Example:

   \`\`\`python
   class TwoTransforms(Scene):
       def transform(self):
           a = Circle()
           b = Square()
           c = Triangle()
           self.play(Transform(a, b))
           self.play(Transform(a, c))
           self.play(FadeOut(a))

       def replacement_transform(self):
           a = Circle()
           b = Square()
           c = Triangle()
           self.play(ReplacementTransform(a, b))
           self.play(ReplacementTransform(b, c))
           self.play(FadeOut(c))

       def construct(self):
           self.transform()
           self.wait(0.5)  # wait for 0.5 seconds
           self.replacement_transform()
   \`\`\`

   \`Transform\` is often better for sequential transformations:

   \`\`\`python
   class TransformCycle(Scene):
       def construct(self):
           a = Circle()
           t1 = Square()
           t2 = Triangle()
           self.add(a)
           self.wait()
           for t in [t1, t2]:
               self.play(Transform(a, t))
   \`\`\`

**EXAMPLE SIMPLE OUTPUT:**
\`\`\`python
from manim import *
from manim_voiceover import VoiceoverScene
from manim_voiceover.services.azure import AzureService
from gtts import gTTS
import os

class TriangleExplanation(VoiceoverScene):
    def construct(self):
        # Set up the voiceover service
        self.set_speech_service(AzureService(
                voice='id-ID-ArdiNeural',
                style=None,
                output_format='Audio48Khz192KBitRateMonoMp3',
		        prosody=None
            ))

        # Create a red triangle
        triangle = Triangle().set_color(RED)
        
        # Generate the voiceover audio
        with self.voiceover("Here is a red triangle.") as narrator:
            self.play(Create(triangle))
        
        # Wait to display the final scene
        self.wait(2)

if __name__ == "__main__":
    from manim import config
    config.media_width = "50%"
    scene = TriangleExplanation()
    scene.render()
\`\`\``;

/**
 * Generate Manim Python code based on a prompt
 * @param {string} prompt - The prompt describing what to visualize
 * @param {string|null} imageBase64 - Optional Base64 encoded image data
 * @param {string} errorMessage - Optional error message for retry attempts
 * @param {number} retryCount - Current retry count
 * @returns {Promise<string>} - Generated Python code
 */
async function generateManimCode(
	prompt,
	imageBase64 = null,
	errorMessage = "",
	retryCount = 0
) {
	const openai = new OpenAI({
		apiKey: config.openai.apiKey,
	});

	let userPrompt = `Generate a Manim Python script that visualizes this user's prompt:
	${prompt}. 
	
	The script should be error-free and renders a video. The language used for the narration should ALWAYS be English.
	
	IMPORTANT NOTE: Name the scene class "ManimScene" exactly (not any other name).`;

	// If this is a retry, include the error message
	if (retryCount > 0) {
		userPrompt = `The previous Manim code had errors. Please fix and generate a new script that visualizes this user's prompt: 
		${prompt}.

        The error was: 
		${errorMessage}

        The script should be error-free and renders a video. The language used for the narration should ALWAYS be English.
        
        IMPORTANT NOTE: Name the scene class "ManimScene" exactly (not any other name).`;
	}

	try {
		const messages = [
			{
				role: "system",
				content: SYSTEM_INSTRUCTION,
			},
		];

		// Add the image if provided
		if (imageBase64) {
			messages.push({
				role: "user",
				content: [
					{
						type: "text",
						text: `Generate a Manim Python script based on this image and the prompt: ${prompt}. Name the scene class "ManimScene" exactly.`,
					},
					{
						type: "image_url",
						image_url: {
							url: `data:image/jpeg;base64,${imageBase64}`,
						},
					},
				],
			});
		} else {
			messages.push({
				role: "user",
				content: userPrompt,
			});
		}

		const response = await openai.chat.completions.create({
			model: "gpt-4.1",
			messages,
			temperature: 0.3, // Lower for more deterministic code generation
			max_tokens: 5000, // Increased to allow for more complex scripts with voiceovers
			top_p: 0.95, // Slightly reduced to focus on more probable tokens
			frequency_penalty: 0.1, // Light penalty to reduce repetitive patterns
			presence_penalty: 0.1, // Light penalty to encourage diversity in the code
		});

		let pythonCode = response.choices[0].message.content;

		// Clean up the response to remove markdown code block markers if present
		pythonCode = pythonCode.replace(/```python\n/g, "").replace(/```/g, "");

		// Replace any scene class name with ManimScene to ensure consistency
		pythonCode = pythonCode.replace(
			/class\s+\w+\s*\(\s*VoiceoverScene\s*\)/g,
			"class ManimScene(VoiceoverScene)"
		);

		return pythonCode;
	} catch (error) {
		console.error("Error calling OpenAI:", error);
		throw new Error(`Failed to generate Manim code: ${error.message}`);
	}
}

module.exports = {
	generateManimCode,
};
