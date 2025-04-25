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

      ```bash
      mkdir manim-tutorial
      cd manim-tutorial
      ```

   b) Create a new file called `scene.py`:

      ```python
      from manim import *

      class CreateCircle(Scene):
          def construct(self):
              circle = Circle()  # create a circle
              circle.set_fill(PINK, opacity=0.5)  # set the color and transparency
              self.play(Create(circle))  # show the circle on screen
      ```

   c) Render the scene with:
      ```bash
      manim -pql scene.py CreateCircle
      ```

5. Animating a circle

   The code example creates a pink circle with 50% opacity:

   ```python
   from manim import *

   class CreateCircle(Scene):
       def construct(self):
           circle = Circle()  # create a circle
           circle.set_fill(PINK, opacity=0.5)  # set the color and transparency
           self.play(Create(circle))  # show the circle on screen
   ```

   - Explanation

     - `from manim import *` imports the entire Manim library
     - We define a class `CreateCircle` that inherits from `Scene`
     - Inside the `construct()` method, we:
       - Create a circle object
       - Set its fill color to pink with 50% opacity
       - Use the `Create` animation to display it

6. Transforming a square into a circle

   ```python
   class SquareToCircle(Scene):
       def construct(self):
           circle = Circle()  # create a circle
           circle.set_fill(PINK, opacity=0.5)  # set color and transparency

           square = Square()  # create a square
           square.rotate(PI / 4)  # rotate a certain amount

           self.play(Create(square))  # animate the creation of the square
           self.play(Transform(square, circle))  # interpolate the square into the circle
           self.play(FadeOut(square))  # fade out animation
   ```

   Render with:

   ```
   manim -pql scene.py SquareToCircle
   ```

7. Positioning Mobjects

   ```python
   class SquareAndCircle(Scene):
       def construct(self):
           circle = Circle()  # create a circle
           circle.set_fill(PINK, opacity=0.5)  # set the color and transparency

           square = Square()  # create a square
           square.set_fill(BLUE, opacity=0.5)  # set the color and transparency

           square.next_to(circle, RIGHT, buff=0.5)  # set the position
           self.play(Create(circle), Create(square))  # show the shapes on screen
   ```

   Render with:

   ```
   manim -pql scene.py SquareAndCircle
   ```

   The `next_to` method positions the square relative to the circle:

   - First argument: reference object (circle)
   - Second argument: direction (RIGHT)
   - `buff=0.5`: adds a small buffer between objects

   You can use other directions like LEFT, UP, or DOWN.

8. Using .animate syntax to animate methods

   ```python
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
   ```

   The `.animate` syntax animates method calls dynamically. For example:

   - `square.animate.rotate(PI / 4)` animates the rotation
   - `square.animate.set_fill(PINK, opacity=0.5)` animates the color change

   Another example showing the difference between `.animate` and dedicated animation methods:

   ```python
   class DifferentRotations(Scene):
       def construct(self):
           left_square = Square(color=BLUE, fill_opacity=0.7).shift(2 * LEFT)
           right_square = Square(color=GREEN, fill_opacity=0.7).shift(2 * RIGHT)
           self.play(
               left_square.animate.rotate(PI), Rotate(right_square, angle=PI), run_time=2
           )
           self.wait()
   ```

9. Transform vs ReplacementTransform

   - `Transform(mob1, mob2)`: Transforms points/attributes of mob1 into mob2
   - `ReplacementTransform(mob1, mob2)`: Literally replaces mob1 with mob2

   Example:

   ```python
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
   ```

   `Transform` is often better for sequential transformations:

   ```python
   class TransformCycle(Scene):
       def construct(self):
           a = Circle()
           t1 = Square()
           t2 = Triangle()
           self.add(a)
           self.wait()
           for t in [t1, t2]:
               self.play(Transform(a, t))
   ```
