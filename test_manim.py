"""
Simple test script to verify that Manim is working properly.
This will create a basic animation to test the Manim installation.
"""
from manim import Scene, Circle, RED, config

# Configure for low quality to make it fast
config.quality = "low_quality"

class TestScene(Scene):
    def construct(self):
        circle = Circle(color=RED)
        self.play(circle.animate.scale(2))
        self.wait(1)
        
print("Manim test script loaded successfully!")
print("You can run this script with: python -m manim test_manim.py TestScene -ql") 