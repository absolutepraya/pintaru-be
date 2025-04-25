"""
Test script to verify that Manim-Voiceover is working properly.
This will create a basic animation with voiceover to test the Manim-Voiceover installation.
"""
from manim import Scene, Circle, RED, config, Text
from manim_voiceover import VoiceoverScene
from manim_voiceover.services.gtts import GTTSService

# Configure for low quality to make it fast
config.quality = "low_quality"

class TestVoiceoverScene(VoiceoverScene):
    def construct(self):
        # Use Google TTS which doesn't require API keys
        self.set_speech_service(GTTSService())
        
        circle = Circle(color=RED)
        title = Text("Testing Manim-Voiceover")
        
        # Test voiceover
        with self.voiceover("This is a test of the Manim-Voiceover library.") as tracker:
            self.play(circle.animate.scale(2))
            
        with self.voiceover("If you can hear this, everything is working correctly.") as tracker:
            self.play(title.animate.scale(1.5))
            
        self.wait(1)
        
print("Manim-Voiceover test script loaded successfully!")
print("You can run this script with: python -m manim test_manim_voiceover.py TestVoiceoverScene -ql") 