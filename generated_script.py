from manim import *
from manim_voiceover import VoiceoverScene
from manim_voiceover.services.openai import OpenAIService

class ManimScene(VoiceoverScene):
    def construct(self):
        eq = MathTex("5x^2", "+", "2x", "-", "3", "=", "0", color=BLUE).scale(1.2)
        self.play(Write(eq))
        self.wait(0.5)

        with self.voiceover(text="Let's solve the quadratic equation: five x squared plus two x minus three equals zero.") as narrator:
            self.wait(2)

        # Highlight coefficients and rewrite in standard form
        self.play(eq.animate.set_color_by_tex_to_color_map({
            "5x^2": YELLOW,
            "2x": RED,
            "-3": GREEN
        }))
        self.wait(0.5)

        with self.voiceover(text="This is in the form a x squared plus b x plus c equals zero, where a is five, b is two, and c is negative three.") as narrator:
            self.wait(3)

        # Show quadratic formula
        formula = MathTex(
            "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", color=BLUE
        ).next_to(eq, DOWN, buff=1)
        self.play(Write(formula))
        self.wait(0.5)

        with self.voiceover(text="Let's use the quadratic formula to find x.") as narrator:
            self.wait(2)

        # Substitute values
        subs = MathTex(
            "x = \\frac{-2 \\pm \\sqrt{2^2 - 4 \\cdot 5 \\cdot (-3)}}{2 \\cdot 5}", color=YELLOW
        ).next_to(formula, DOWN, buff=0.7)
        self.play(TransformMatchingTex(formula.copy(), subs))
        self.wait(0.5)

        with self.voiceover(text="Substituting the values, we get x equals negative two plus or minus the square root of two squared minus four times five times negative three, all over ten.") as narrator:
            self.wait(4)

        # Calculate discriminant
        discrim = MathTex(
            "2^2 - 4 \\cdot 5 \\cdot (-3) = 4 + 60 = 64"
        ).scale(0.9).next_to(subs, DOWN, buff=0.7)
        self.play(Write(discrim))
        self.wait(0.5)

        with self.voiceover(text="Calculate the expression under the square root. Two squared is four. Negative four times five times negative three gives plus sixty. So, the discriminant is sixty four.") as narrator:
            self.wait(4)

        # Final solution
        roots = MathTex(
            "x = \\frac{-2 \\pm 8}{10}"
        ).next_to(discrim, DOWN, buff=0.7).set_color(RED)
        self.play(Write(roots))
        self.wait(0.5)

        with self.voiceover(text="So, we have x equals negative two plus or minus eight, divided by ten.") as narrator:
            self.wait(3)

        # Break down roots
        root1 = MathTex("x_1 = \\frac{-2+8}{10} = \\frac{6}{10} = 0.6").next_to(roots, DOWN, buff=0.7).set_color(GREEN)
        root2 = MathTex("x_2 = \\frac{-2-8}{10} = \\frac{-10}{10} = -1").next_to(root1, DOWN, buff=0.5).set_color(GREEN)
        self.play(Write(root1))
        self.wait(0.5)
        self.play(Write(root2))
        self.wait(0.5)

        with self.voiceover(text="The solutions are x equals zero point six, and x equals negative one.") as narrator:
            self.wait(2)
