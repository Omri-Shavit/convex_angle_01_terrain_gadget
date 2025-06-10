# Convex Angle 0/1 Terrain Gadget
## Demo Video:
[![Demo Video](https://img.youtube.com/vi/W_kZSaz0OZ4/0.jpg)](https://www.youtube.com/watch?v=W_kZSaz0OZ4 "Demo Video")

[This webapp](https://omri-shavit.github.io/convex_angle_01_terrain_gadget/) is a proof of concept for a 0/1 terrain gadget that extrudes a wedge of any convex angle $\alpha\in [0,\pi]$
## Usage
1. Adjust the angle ($\alpha$) and height parameters using their respective sliders
2. Watch the crease pattern and folded model update in real-time
3. Click "Simulate Folding" to see the crease pattern fold in an [Origami Simulator](https://origamisimulator.org/) Modal
	- Note: I found the simulator works best if you go into `advanced options > simulation settings` and decrease `Fold Stiffness` slider to ~0.01
4. Download the .fold file with the download button if you'd like (:
## Technologies Used
- [Desmos](https://www.desmos.com/) [2D](https://www.desmos.com/api/v1.11/docs/index.html) and [3D](https://www.desmos.com/api/v1.12/docs/3d.html) graph apis for visualizing the crease pattern and folded model
- [Amanda Ghassaei's](http://amandaghassaei.com/) [Origami Simulator](https://origamisimulator.org/)
- Vanilla JavaScript
- CSS
## Credits
© 2025 Omri Shavit