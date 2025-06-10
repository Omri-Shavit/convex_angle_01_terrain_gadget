// Get components from the DOM
const creasePatternDiv = document.getElementById('creasePatternCalculator');
const foldedModelDiv = document.getElementById('foldedModelCalculator');
const angleSlider = document.getElementById('angleSlider');
const angleSliderValue = document.getElementById('angleSliderValue');
const heightSlider = document.getElementById('heightSlider');
const heightSliderValue = document.getElementById('heightSliderValue');
const downloadFoldBtn = document.getElementById('downloadFoldBtn');
const simulateFoldBtn = document.getElementById('simulateFoldBtn');
const modal = document.getElementById('origamiModal');
const closeModalBtn = document.getElementById('closeModal');
const origamiIframe = document.getElementById('origamiIframe');

// Initialize the calculators
const creasePatternCalc = Desmos.GraphingCalculator(creasePatternDiv, {
    expressions: false,
    keypad: false,
    settingsMenu: false,
    zoomButtons: false
});

const foldedModelCalc = Desmos.Calculator3D(foldedModelDiv, {
    expressions: false,
    keypad: false,
    settingsMenu: false,
    zoomButtons: false
});

// fetch graph data and set the state of the calculators
fetch("./creasePatternGraph.json").then(response=>response.json()).then(data=>{
    creasePatternCalc.setState(data);
});

fetch("./foldedModelGraph.json").then(response=>response.json()).then(data=>{
    foldedModelCalc.setState(data);
});

{ // All code pertaining to parameter controls
    // event listener for angle slider
    function updateAngle(angleDeg) {
        angleSlider.value = angleDeg;
        angleSliderValue.innerHTML = angleDeg.toFixed(3) + "&deg;";
        
        // if the height is too great, internal vertices go off the page, so we
        const angle = angleDeg * Math.PI / 180.0;
        const maxHeight = (1 - 2 * 0.01) * Math.sin(angle/2) / (1 + Math.sin(angle/2)**2);
        heightSlider.max = maxHeight.toFixed(3);
        if (parseFloat(heightSlider.value) > maxHeight) {
            heightSlider.value = maxHeight.toFixed(3);
            updateHeight(maxHeight);
        }

        // Update both calculators with the new parameter value
        creasePatternCalc.setExpression({
            id: 'alpha',
            latex: `\\alpha = ${angle}`
        });
        
        foldedModelCalc.setExpression({
            id: 'alpha',
            latex: `\\alpha = ${angle}`
        });
    }

    angleSlider.addEventListener('input', (e) => {
        const angleDeg = parseFloat(e.target.value);
        updateAngle(angleDeg);
    });

    // Event listener for height slider
    function updateHeight(height) {
        heightSliderValue.innerHTML = height.toFixed(3);
        
        // Update both calculators with the new parameter value
        creasePatternCalc.setExpression({
            id: 'height',
            latex: `h = ${height}`
        });
        
        foldedModelCalc.setExpression({
            id: 'height',
            latex: `h = ${height}`
        });
    }

    // Add the event listener to the height slider
    heightSlider.addEventListener('input', () => {
        const height = parseFloat(heightSlider.value);
        updateHeight(height);
    });
}

{ // All code pertaining to the origami simulator modal
    // Simulate fold button
    simulateFoldBtn.addEventListener('click', function() {
        // Set the iframe source to the origami simulator
        origamiIframe.src = 'https://origamisimulator.org/?model=';

        // wait for iframe to load
        origamiIframe.onload = () => {
            // send the fold file to the iframe
            origamiIframe.contentWindow.postMessage({
                op: 'importFold', 
                fold: generateFoldFile(),
            },'*');
            // Show the modal and trigger animation
            modal.style.display = 'block';

            // Force reflow to ensure display change is applied before animation
            modal.offsetHeight;
            modal.classList.add('show');
        }
    });

    // Function to close modal with animation
    function closeModal() {
        modal.classList.remove('show');
        modal.classList.add('hide');

        // remove onload listener
        origamiIframe.onload = null;
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('hide');
            // Clear iframe src to stop loading/reset the simulator
            origamiIframe.src = '';
        }, 400); // Match the CSS transition duration
    }

    // Close modal when clicking the X button
    closeModalBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
}

/**
 * Generates a FOLD file format object representing the crease pattern of the
 * convex angle 0/1 terrain gadget with given angle and height fixed.
 * 
 * @returns {Object} A FOLD format object containing:
 *   - file_spec {number} - The FOLD format version (1.2)
 *   - file_creator {string} - Name of the generator
 *   - file_classes {string[]} - Classes describing the file type ["singleModel"]
 *   - frame_classes {string[]} - Classes describing the frame type ["creasePattern", "noCuts"]
 *   - vertices_coords {number[][]} - Array of [x,y] coordinates for each vertex
 *   - edges_vertices {number[][]} - Array of [v1,v2] vertex indices for each edge
 *   - edges_assignment {string[]} - Array of edge types ("M" for mountain, "V" for valley, "B" for border)
 *   - edges_foldAngle {number[]} - Array of fold angles in degrees
 *   - faces_vertices {number[][]} - Array of vertex indices defining each face
 * 
 * @see {@link https://github.com/edemaine/fold/blob/main/doc/spec.md FOLD format specification}
 */
function generateFoldFile() {
    // most of the magic happens here, but the code is pretty hard to read as
    // it's more visual than algorithmic.
    // get the two parameters, alpha and h
    const alphaDeg = parseFloat(angleSlider.value);
    const alpha = alphaDeg * Math.PI / 180.0; // convert to radians
    const h = 0.1767766952966369; // parseFloat(heightSlider.value); // height

    // pre-compute some values
    const cao2 = Math.cos(alpha/2);
    const sao2 = Math.sin(alpha/2);
    const tao2 = Math.tan(alpha/2);
    const cotao2 = 1/tao2;
    const cscao2 = 1/sao2;
    const secao2 = 1/cao2;

    // pre-compute some important conditions pertaining to where the creases 
    // intersect with the boundary
    // e.g. cond1 determines weather p13 and p6 are on the top edge or  
    const cond1 = (alphaDeg <= 90);
    const cond2 = (cao2 - sao2 <= 2* h);
    const cond3 = (cao2 + sao2 - h >= secao2)
    const cond4 = (sao2 <= cao2);
    
    // vertices
    let vertices = [
        {
            name: 'p1',
            x: 1/2 - h * cao2, 
            y: 1/2 - h * sao2, 
        },
        {
            name: 'p2',
            x: 1/2 - (h / 2) * cao2, 
            y: 1/2 - (h / 2) * (cscao2 + sao2), 
        },
        {
            name: 'p3',
            x: 1/2 + (h / 2) * cao2, 
            y: 1/2 - (h / 2) * (cscao2 + sao2), 
        },
        {
            name: 'p4',
            x: 1/2 + h * cao2,
            y: 1/2 - h * sao2,
        },
        {
            name: 'p5',
            x: 1/2,
            y: 1/2
        },
        cond1 ? {
            name: 'p6',
            x: 1/2 * tao2 + 1/2,
            y: 1
        } : {
            name: 'p6',
            x: 1,
            y: 1/2 * cotao2 + 1/2
        },
        cond2 ? {
            name: 'p7',
            x: 1,
            y: 1/2 * cotao2 + 1/2 - h * cscao2
        }: {
            name: 'p7',
            x: 1/2 + h * secao2 + 1/2 * tao2,
            y: 1
        },
        cond1 ? {
            name: 'p8',
            x: 1,
            y: 1/2 - 1/2 * tao2
        }: {
            name: 'p8',
            x: 1/2 * cotao2 + 1/2,
            y: 0
        },
        cond3 ? {
            name: 'p9',
            x: 1,
            y: -1/2 * tao2 + 1/2 - 1/2 * h * cscao2
        } : {
            name: 'p9',
            x: 1/2 + 1/2 * cotao2 - 1/2 * h * (cao2 / (sao2 * sao2)), // simplified?
            y: 0
        },
        cond3 ? {
            name: 'p10',
            x: 0,
            y: -1/2 * tao2 + 1/2 - 1/2 * h * cscao2
        } : {
            name: 'p10',
            x: 1/2 - 1/2 * cotao2 + 1/2 * h * (cao2 / (sao2 * sao2)),
            y: 0
        },
        cond1 ? {
            name: 'p11',
            x: 0,
            y: 1/2 - 1/2 * tao2
        } : {
            name: 'p11',
            x: 1/2 - 1/2 * cotao2,
            y: 0
        },
        cond2 ? {
            name: 'p12',
            x: 0, 
            y: 1/2 * cotao2 + 1/2 - h * cscao2
        } : {
            name: 'p12',
            x: 1/2 - h * secao2 - 1/2 * tao2,
            y: 1
        },
        cond1 ? {
            name: 'p13',
            x: 1/2 - 1/2 * tao2,
            y: 1
        } : {
            name: 'p13',
            x: 0,
            y: 1/2 * cotao2 + 1/2
        },
        {
            name: 'b1',
            x: 0, y: 1
        },
        {
            name: 'b2',
            x: 1, y: 1
        },
        {
            name: 'b3',
            x: 1, y: 0
        },
        {
            name: 'b4',
            x: 0, y: 0
        }
    ];

    const [
        p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, b1, b2, b3, b4
    ] = vertices;

    let edges = [
        // crease edges
        {
            endpoints: [p8, p4],
            assignment: "M",
            angle: -180
        },
        {
            endpoints: [p4, p5],
            assignment: "M",
            angle: -90
        },
        {
            endpoints: [p4, p3],
            assignment: "M",
            angle: -90
        },
        {
            endpoints: [p11, p1],
            assignment: "M",
            angle: -180
        },
        {
            endpoints: [p1, p5],
            assignment: "M",
            angle: -180
        },
        {
            endpoints: [p4, p7],
            assignment: "V",
            angle: 90
        },
        {
            endpoints: [p13, p5],
            assignment: "M",
            angle: -90
        },
        {
            endpoints: [p6, p5],
            assignment: "M",
            angle: -90
        },
        { // important valley fold right here
            endpoints: [p2, p3],
            assignment: "V",
            angle: 180 - (180 / Math.PI) * Math.atan(
                2 * sao2 / (cao2 * cao2)
            )
        },
        {
            endpoints: [p3, p9],
            assignment: "V",
            angle: 180
        },
        {
            endpoints: [p2, p10],
            assignment: "V",
            angle: 180
        },
        {
            endpoints: [p1, p12],
            assignment: "V",
            angle: 90
        },
        {
            endpoints: [p1, p2],
            assignment: "M",
            angle: -90
        },
        { // another important valley fold right here
            endpoints: [p5,p2],
            assignment: "V",
            angle: 90 + (180 / Math.PI) * Math.asin(
                4 * sao2 * sao2 / (3 - Math.cos(alpha))
            )
        },
        {
            endpoints: [p5, p3],
            assignment: "V",
            angle: 90 + (180 / Math.PI) * Math.asin(
                4 * sao2 * sao2 / (3 - Math.cos(alpha))
            )
        },
        // boundary edges
        {
            endpoints: [
                cond1 ? p13 : b1,
                cond1 ? p6 : b2
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond1 ? p6 : b2,
                (cond2 ? (cond1 ? b2 : p6) : p7)
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                (cond2 ? (cond1 ? b2 : p6) : p7),
                cond2 ? p7 : b2
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond2 ? p7 : b2,
                cond4 ? p8 : b3 
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond4 ? p8 : b3,
                cond3 ? p9 : (cond4 ? b3: p8)
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond3 ? p9 : (cond4 ? b3: p8),
                cond3 ? b3 : p9
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond3 ? b3 : p9,
                cond3 ? b4 : p10
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond3 ? b4 : p10,
                cond3 ? p10 : (cond4 ? b4: p11)
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond3 ? p10 : (cond4 ? b4: p11),
                cond4 ? p11 : b4
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond4 ? p11 : b4,
                cond2 ? p12 : b1
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond2 ? p12 : b1,
                cond2 ? (cond1 ? b1 : p13) : p12
            ],
            assignment: "B",
            angle: 0
        },
        {
            endpoints: [
                cond2 ? (cond1 ? b1 : p13) : p12,
                cond1 ? p13 : b1
            ],
            assignment: "B",
            angle: 0
        }
    ];

    let faces = [
        // constant faces
        [p3, p5, p2],
        [p3, p4, p5],
        [p1, p2, p5],
        // faces predicated on conditions (i.e. with boundary edges)
        cond1 ? [p5,p6,p13]: [p5, p6, b2, b1, p13],
        (cond1 && cond2) ? [p4, p7, b2, p6, p5] : [p4, p7, p6, p5],
        (cond1 && cond2) ? [p5, p13, b1, p12, p1] : [p5, p13, p12, p1],
        cond1 ? (cond2 ? [p4, p8, p7] : [p4, p8, b2, p7]) : [p4, p8, b3, p7],
        cond1 ? (cond2 ? [p1, p12, p11] : [p1, p12, b1, p11]) : [p1, p12, b4, p11],
        (!cond1 || cond3) ? [p8, p4, p3, p9] : [p4, p3, p9, b3, p8],
        (!cond1 || cond3) ? [p1, p11, p10, p2] : [p1, p11, b4, p10, p2],
        cond3 ? [p2, p10, b4, b3, p9, p3] : [p2, p10, p9, p3]
    ];

    // remove corner vertices b1, b2, b3, b4 if they're too close to adjacent vertices
    for (let [bl, br, pl, pr] of [
        [b1, b2, p13, p6],
        [b1, b2, p12, p7],
        [b3, b4, p8, p11],
        [b3, b4, p9, p10]
    ]){
        if (Math.abs(pl.x - bl.x) < 1e-6 && Math.abs(pl.y - bl.y) < 1e-6){
            // in this case, both bl and br are sufficiently close to pl and pr
            // respectively, so we remove them.
            vertices = vertices.filter(v => v.name !== br.name && v.name !== bl.name);
            // any edge with enpoint bl/br has said endpoint replaced with pl/pr
            edges = edges.map(edge=>{
                return {
                    endpoints: edge.endpoints.map(endpoint=>{
                        if (endpoint.name === bl.name) return pl;
                        if (endpoint.name === br.name) return pr;
                        return endpoint;
                    }),
                    assignment: edge.assignment,
                    angle: edge.angle
                }
            });
            // remove any edges connecting an endpoint with itself
            edges = edges.filter(e=> e.endpoints[0].name !== e.endpoints[1].name);

            // remove instances of bl and br from all faces
            faces = faces.map(face => {
                // first replace bl and br with pl and pr respectively
                face = face.map(vertex => {
                    if (vertex.name === bl.name) return pl;
                    if (vertex.name === br.name) return pr;
                    return vertex;
                });
                
                // second, remove duplicate vertices
                const seenVertices = new Set();
                const faceWithoutDuplicates = [];
                for (let vertex of face){
                    if (!seenVertices.has(vertex.name)){
                        seenVertices.add(vertex.name);
                        faceWithoutDuplicates.push(vertex);
                    }
                }
                return faceWithoutDuplicates;
            });
        }
    }

    // construct a map from vertex names to their indices
    const vertexNameToId = new Map();
    for (let i = 0; i < vertices.length; i++) {
        vertexNameToId.set(vertices[i].name, i);
    }

    // begin construction of the crease pattern object in accordance with 
    // the .fold format
    const vertices_coords = vertices.map(v => [v.x, 1-v.y]); // flip y axis
    const edges_vertices = edges.map(e => [
        vertexNameToId.get(e.endpoints[0].name),
        vertexNameToId.get(e.endpoints[1].name)
    ].sort());
    const edges_assignment = edges.map(e => e.assignment);
    const edges_foldAngle = edges.map(e => e.angle);
    const faces_vertices = faces.map(face => {
        return face.map(v => vertexNameToId.get(v.name))
    });

    const creasePattern = {
        file_spec: 1.2,
        file_creator: "convex angle 0/1 terrain gadget",
        file_classes: ["singleModel"],
        frame_classes: ["creasePattern","noCuts"],
        vertices_coords: vertices_coords,
        edges_vertices: edges_vertices,
        edges_assignment: edges_assignment,
        edges_foldAngle: edges_foldAngle,
        faces_vertices: faces_vertices
    };

    return creasePattern;
}

// Add event listener for download button
downloadFoldBtn.addEventListener('click', function() {
    // Get the fold file data
    const foldData = generateFoldFile();
    
    // Convert to JSON string with nice formatting
    const foldString = JSON.stringify(foldData, null, 2);
    
    // Create a blob with the data
    const blob = new Blob([foldString], { type: 'application/json' });
    
    // Create a temporary download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${Math.round(parseFloat(angleSlider.value))}Degree01TerrainGadget.fold`;  // Name of the downloaded file
    
    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadLink.href);
});