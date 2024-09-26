# 3D Scene Visualizer with WebGL


<h3> This repository implements a 3D scene with a tree:</h3>

- This project is a 3D scene visualizer that generates and displays a tree using WebGL
- The tree is created through recursive algorithms and is visualized with custom shaders
- Key features include:
  - Recursive Tree Generation:
    * The tree is generated using a recursive algorithm that creates branches based on edge points. This process simulates natural tree growth
  - Random Tree Generation:
    * Each tree is generated with random variations in branch length and structure, making each tree unique 
  - Rendering with Shaders:
    * The vertices of the ground, branches, and leaves are passed to shaders for rendering on the web. These shaders handle the drawing of the 3D objects, including the tree and its leaves
  - Color Shading:
    * The scene includes color shading to give visual distinction between different elements
  - Camera View Rotation:
    * Users can rotate the scene to view the tree from different angles. This is controlled through a camera view matrix that allows dynamic rotation and viewing of the tree in 3D space
  - Simulation of Sunset & Sunrise:
    * Shader-based simulation of sunset and sunrise, which changes the color of the scene with time