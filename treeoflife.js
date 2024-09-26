/*
    CSCI 2408 Computer Graphics Fall 2022 
    (c)2022 by Ayan Hashimova, Amina Shikhaliyeva, Sadig Latifli, Sevinj Aliyeva
    Submitted in partial fulfillment of the requirements of the course.
*/

var canvas;
var gl;
window.onload = init;

const default_initial_length = Math.random() * (0.8 - 0.4) + 0.4, default_thickness = Math.random() * (0.15 - 0.1) + 0.1, default_leaf_size = Math.random() * (0.08 - 0.05) + 0.05;
const default_ax = Math.floor(Math.random() * 27 + 5), default_az = Math.floor(Math.random() * 60 + 10), default_bx = Math.floor(Math.random() * (100 - 80) + 80), default_bz = Math.floor(Math.random() * (40 - 25) + 25), default_cx = Math.floor(Math.random() * (265 - 250) + 250), default_cz = Math.floor(Math.random() * 50 + 20);
const default_m2 = Math.random() * (0.5 - 0.3) + 0.3, default_m3 = Math.random() * (0.7 - 0.5) + 0.5, default_k1 = Math.random() * (0.7 - 0.6) + 0.6, default_k2 = Math.random() * (0.8 - 0.7) + 0.7, default_k3 = Math.random() * (0.6 - 0.5) + 0.5;
const default_limit = Math.floor(Math.random() * (10 - 5) + 5);

function init() {
    // Get reference to the context of the canvas
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.clearColor(0.7, 0.8, 0.9, 1.0);

    let branch = new Branch(default_thickness, default_initial_length);
    let tree = new Tree(default_initial_length, default_thickness, default_leaf_size,
        default_limit, default_ax, default_az, default_bx, default_bz,
        default_cx, default_cz, default_m2, default_m3, default_k1, default_k2, default_k3);

    let branches = [], leaves = [];

    tree.generateTree(mat4(), branch, 0, branches, leaves);
    let display = new Display(branches, leaves);
    // start the program
    display.startProgram();
    // start the sunrise & sunset simulation
    display.sunIterative();
}

class Display {
    verticesToDisplay = [];
    colorsToDisplay = [];
    modelMatrixLoc;
    viewMatrixLoc;
    projectionMatrixLoc;
    lightLoc;
    normalLoc;
    invTranspMatrixLoc;
    vPosition;
    vColor;
    vertexBuffer;
    colorBuffer;
    normalBuffer;
    normals = [];

    constructor(branches, leaves) {
        this.branches = branches;
        this.leaves = leaves;
        this.rotX = 1000;
        this.rotY = 0;
        this.rotZ = 0;
        this.lookX = 0;
        this.lookY = 0;
        this.lookZ = -1.3;
        this.centerX = 0;
        this.centerY = 0;
        this.centerZ = 0;
        this.dirX = 4;
        this.dirY = 1;
        this.dirZ = -3;
        this.cnt = 0;

        this.bindingFunctions();
        this.assignFunctions();
    }

    // function assigns events to functions    
    assignFunctions() {
        document.addEventListener("keydown", this.rotateOnKeyDown);
    }

    // function binds each function to the class for functionality
    bindingFunctions() {
        this.rotateOnKeyDown = this.rotateOnKeyDown.bind(this);
    }

    rotateOnKeyDown(e) {
        switch (e.key) {
            case 'w':
                this.rotX += 2.0;
                break;
            case 's':
                this.rotX -= 2.0;
                break;
            case 'q':
                this.rotY += 2.0;
                break;
            case 'e':
                this.rotY -= 2.0;
                break;
            case 'a':
                this.rotZ += 2.0;
                break;
            case 'd':
                this.rotZ -= 2.0;
                break;
            // for camera view actions
            case 'j':
                this.lookX -= 0.1; //walk with camera, look left
                this.centerX -= 0.3;
                break;
            case 'l':
                this.lookX += 0.1; //walk with camera, look right
                this.centerX += 0.3
                break;
            case 'i':
                this.lookZ += 0.1; //walk with camera, walk closer | forward
                this.centerZ += 0.1            
                break;
            case 'k':
                this.lookZ -= 0.1; //walk with camera, walk further | backward
                this.centerZ -= 0.1
                break;
            case 'u':
                this.lookY -= 0.1; //walk with camera, look up
                this.centerY -= 0.5;
                break;
            case 'o':
                this.lookY += 0.1; //walk with camera, look down
                this.centerY += 0.5
                break;
        }
        this.renderTree();
    }

    startProgram() {
        // initialize shaders (both vertex and fragment)
        let program = initShaders(gl, "vertex-shader", "fragment-shader");
        gl.useProgram(program);

        // construct and get all branches in 1 array vertices
        this.constructVertices(this.branches, this.leaves);
        // construct and get all colors in 1 array vertices
        this.constructColors(this.branches, this.leaves);
        // construct and get all normals in 1 array vertices
        this.constructNormals(this.branches, this.leaves);

        // create buffer
        this.vertexBuffer = gl.createBuffer();
        // bind the array buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        // add the vertices to the buffer
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.verticesToDisplay), gl.STATIC_DRAW);
        // get position attribute in vertex shader (WebGL Program)
        this.vPosition = gl.getAttribLocation(program, "vPosition");
        gl.vertexAttribPointer(this.vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vPosition);

        // get matrix attributes in the vertex shader (WebGL Program)
        this.modelMatrixLoc = gl.getUniformLocation(program, "modelMatrix");
        this.viewMatrixLoc = gl.getUniformLocation(program, "viewMatrix");
        this.projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
        this.lightLoc = gl.getUniformLocation(program, "vLight");
        this.invTranspMatrixLoc = gl.getUniformLocation(program, "invTranspMatrix")

        this.normalLoc = gl.getAttribLocation(program, "vNormal");
        this.normalBuffer = gl.createBuffer();
        // bind the array buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        // add the vertices to the buffer
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

        gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.normalLoc);

        // create buffer
        this.colorBuffer = gl.createBuffer();
        // bind the array buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        // add the vertices to the buffer
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.colorsToDisplay), gl.STATIC_DRAW);
        this.vColor = gl.getAttribLocation(program, "vColor");
        gl.vertexAttribPointer(this.vColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vColor);

        // render the shape
        this.renderTree();
    }

    // simulate sun rise and set : rise from right and set form left side
    riseSetSun() {
        if(this.cnt <= 20){
            this.cnt++;
            this.dirX -= 0.2;
            this.dirY -= 0.2;
            this.dirZ += 0.2;
        }
        else{
            this.cnt++;
            this.dirX += 0.5;
            this.dirY += 0.5;
            this.dirZ -= 0.5;
        }
        if(this.cnt == 40) {
            this.cnt=0;
            this.dirX = 4;
            this.dirY = 1;
            this.dirZ = 0;
        }
        this.renderTree();
    }

    // iteratively call riseSetSun function to have an animation 
    sunIterative(){
        this.riseSetSun();
        setInterval(() => this.riseSetSun(), 200);
    }

    /**The constructVertices function first adds the vertices of the ground object to the verticesToDisplay array. It does this by
     *  iterating over the faces property of the ground object, which is an array of 12 faces.
     *  Each face consists of three indices that correspond to vertices in the vertices property of the ground object. 
     * The function pushes these three vertices (in the order specified by the indices) to the verticesToDisplay array.
    Next, the function iterates over the branches array and does the same thing for each branch object. It adds the vertices 
    of each branch object to the verticesToDisplay array in the same way as it did for the ground object.
    Finally, the function iterates over the leaves array and adds the vertices of each leaf object to the 
    verticesToDisplay array. In this case, it only adds the vertices of the 6 faces of each leaf object */

    constructVertices(branches, leaves) {
        let ground = new Ground(1, 0.2);
        for (let j = 0; j < 12; j++) {
            this.verticesToDisplay.push(ground.vertices[ground.faces[j][0]],
                ground.vertices[ground.faces[j][1]], ground.vertices[ground.faces[j][2]]);
        }
        for (let i = 0; i < branches.length; i++) {
            let branch = branches[i];
            for (let j = 0; j < 12; j++) {
                this.verticesToDisplay.push(branch.vertices[branch.faces[j][0]],
                    branch.vertices[branch.faces[j][1]], branch.vertices[branch.faces[j][2]]);
            }
        }
        for (let i = 0; i < leaves.length; i++) {
            let leaf = leaves[i];
            for (let j = 0; j < 6; j++) {
                this.verticesToDisplay.push(leaf.vertices[leaf.faces[j][0]],
                    leaf.vertices[leaf.faces[j][1]], leaf.vertices[leaf.faces[j][2]]);
            }
        }
    }
    // The constructColors function creates a Ground object. It then pushes the color attribute of this Ground object three times onto the colorsToDisplay array. 
    // Next, the function iterates over the branches array and pushes the first color in the colors array of the first branch (branches[0]) onto the colorsToDisplay array. 
    // Finally, the function iterates over the leaves array and pushes the second color in the colors array of the first leaf (leaves[0]) onto the colorsToDisplay. 
    // Overall, this function generates an array of colors to be displayed.
    
    constructColors(branches, leaves) {
        let ground = new Ground(1, 0.2)
        for (let j = 0; j < 12; j++) {
            this.colorsToDisplay.push(ground.color, ground.color, ground.color);
        }
        for (let i = 0; i < branches.length; i++) {
            for (let j = 0; j < 12; j++) {
                this.colorsToDisplay.push(branches[0].colors[0], branches[0].colors[0], branches[0].colors[0]);
            }
        }
        for (let i = 0; i < leaves.length; i++) {
            for (let j = 0; j < 6; j++) {
                this.colorsToDisplay.push(leaves[0].colors[1], leaves[0].colors[1], leaves[0].colors[1]);
            }
        }
    }

    // constructNormals function is generating an array of normals (vectors perpendicular to the surface of a geometric object) based on the input array of branches and the input array of leaves.
    // The first thing the function does is create a new Ground object. It then iterates over the faces attribute of the Ground object and calculates the normal for each face. To calculate the normal
    //  for a face, the function first determines the vectors v1 and v2 by subtracting the coordinates of two vertices of the face from the coordinates of a third vertex of the face. It then calculates 
    // the normal for the face by taking the cross product of v1 and v2 and normalizing the result (scaling the vector). Next, the function iterates over the branches array and repeats the same process
    // for each branch, pushing the calculated normals for each branch onto the normals array. Finally, the function iterates over the leaves array and repeats the same process for each leaf, 
    // pushing the calculated normals for each leaf onto the normals array.
    // Overall, this function generates an array of normals for the ground, branches, and leaves, in that order.

    constructNormals(branches, leaves) {
        let ground = new Ground(1, 0.2);
        for (let j = 0; j < 12; j += 2) {
            let v1 = subtract(ground.vertices[ground.faces[j][1]], ground.vertices[ground.faces[j][0]]);
            let v2 = subtract(ground.vertices[ground.faces[j][2]], ground.vertices[ground.faces[j][0]]);
            let normal = normalize(cross(v1, v2));
            this.normals.push(normal, normal, normal, normal, normal, normal);
        }
        for (let i = 0; i < branches.length; i++) {
            let branch = branches[i];
            for (let j = 0; j < 12; j += 2) {
                let v1 = subtract(branch.vertices[branch.faces[j][1]], branch.vertices[branch.faces[j][0]]);
                let v2 = subtract(branch.vertices[branch.faces[j][2]], branch.vertices[branch.faces[j][0]]);
                let normal = normalize(cross(v1, v2));
                this.normals.push(normal, normal, normal, normal, normal, normal);
            }
        }
        for (let i = 0; i < leaves.length; i++) {
            let leaf = leaves[i];
            for (let j = 0; j < 6; j++) {
                let v1 = subtract(leaf.vertices[leaf.faces[j][1]], leaf.vertices[leaf.faces[j][0]]);
                let v2 = subtract(leaf.vertices[leaf.faces[j][2]], leaf.vertices[leaf.faces[j][0]]);
                let normal = normalize(cross(v1, v2));
                this.normals.push(normal, normal, normal);
            }
        }
    }

    renderTree() {
        // init view port to canvas size
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        // clear the color buffer
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // enable culling
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        // enable depth sort
        gl.enable(gl.DEPTH_TEST);
        // initialize matrices to be used
        let modelMatrix = mat4();
        let viewMatrix = mat4();
        let projectionMatrix = mat4();
        // apply rotations on the identity matrix
        modelMatrix = this.transformMatrix(modelMatrix);
        // lookat takes the view matrix with params of eye, at, and up
        // eye basically is the location of the camera, 
        // at indicates point at which the camera is looking, 
        // and up indicated the direction that we want to be perceived as upward direction
        viewMatrix = lookAt([this.lookX, this.lookY, this.lookZ], [this.centerX, this.centerY, this.centerZ], [0,1,0]);
        // indicate a projection matrix with 90 degrees of view, aspect ratio of canvas size, near place being 0.5 and far equaling to 100
        projectionMatrix = perspective(90, - gl.canvas.width / gl.canvas.height, 0.3, 100);
        // set the inverse transpose matrix by inversing the model matrix and then transposing it -- done for better lighting (especially in case of shrinking)
        let invTranspMatrix = transpose(inverse(modelMatrix));
        // set the value of the uniform valiables
        gl.uniformMatrix4fv(this.modelMatrixLoc, false, flatten(modelMatrix));
        gl.uniformMatrix4fv(this.viewMatrixLoc, false, flatten(viewMatrix));
        gl.uniformMatrix4fv(this.projectionMatrixLoc, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(this.invTranspMatrixLoc, false, flatten(invTranspMatrix));

        let lightDir = vec3(this.dirX, this.dirY, this.dirZ);
        gl.uniform3fv(this.lightLoc, lightDir);

        // draw the tree by using triangle faces
        gl.drawArrays(gl.TRIANGLES, 0, this.verticesToDisplay.length);
    }

    transformMatrix(matrix) {
        matrix = mult(matrix, rotateX(this.rotX - 30));
        matrix = mult(matrix, rotateY(this.rotY));
        matrix = mult(matrix, rotateZ(this.rotZ));
        matrix = mult(matrix, translate(0.01, 0, -0.7));

        return matrix;
    }
}

class Ground {
    constructor(thickness, height) {
        this.thickness = thickness;
        this.height = height;

        let halfThickness = this.thickness / 2;
        this.vertices = [
            vec4(-halfThickness, 0, -this.height),
            vec4(0, - halfThickness, -this.height),
            vec4(halfThickness, 0, -this.height),
            vec4(0, halfThickness, -this.height),
            vec4(- halfThickness, 0, 0),
            vec4(0, - halfThickness, 0),
            vec4(halfThickness, 0, 0),
            vec4(0, halfThickness, 0)
        ];

        this.faces = [
            //right bottom   right top
            [3, 6, 2], [3, 7, 6],
            //right right bottom      right right top
            [5, 1, 2], [5, 2, 6],
            // down right    down left
            [3, 2, 1], [3, 1, 0],
            //left top left bottom
            [3, 4, 7], [3, 0, 4],
            //left left bottom    left left top
            [5, 0, 1], [5, 4, 0],
            //upper right  upper left
            [5, 6, 7], [5, 7, 4]
        ]

        this.color = vec4(0.0, 0.6, 0.2, 1.0);
    }
}

// a branch structure for usage in the trees
/**
 * The Branch class represents a branch in a tree.
 * It has properties for the branch's thickness, and height,
 * as well as an array of coordinates representing the branch's vertices.
 */
class Branch {
    constructor(thickness, height) {
        this.thickness = thickness;
        this.height = height;

        let halfThickness = this.thickness / 2;
        this.vertices = [
            vec4(-halfThickness, 0, 0),
            vec4(0, - halfThickness, 0),
            vec4(halfThickness, 0, 0),
            vec4(0, halfThickness, 0),
            vec4(- halfThickness, 0, this.height),
            vec4(0, - halfThickness, this.height),
            vec4(halfThickness, 0, this.height),
            vec4(0, halfThickness, this.height)
        ];

        this.faces = [
            //right bottom   right top
            [3, 6, 2], [3, 7, 6],
            //right right bottom      right right top
            [5, 1, 2], [5, 2, 6],
            // down right    down left
            [3, 2, 1], [3, 1, 0],
            //left top left bottom
            [3, 4, 7], [3, 0, 4],
            //left left bottom    left left top
            [5, 0, 1], [5, 4, 0],
            //upper right  upper left
            [5, 6, 7], [5, 7, 4]
        ]

        this.colors = [
            vec4(0.3, 0.2, 0.2, 1.0),
            vec4(0.0, 0.0, 0.0, 1.0),
            vec4(0.0, 0.0, 0.0, 1.0)
        ]
    }
}

// a class structure of a leaf that stores vertices and faces
class Leaf {
    constructor(height) {
        this.height = height;

        this.vertices = [
            vec4(this.height / 2, 0, 0),
            vec4(0, this.height / 2, 0),
            vec4(-this.height / 2, 0, 0),
            vec4(0, -this.height / 2, 0),
            vec4(0, 0, this.height / 2)
        ]

        this.faces = [
            //bottom right    bottom left
            [0, 3, 1], [3, 2, 1],
            //right    right right
            [0, 1, 4], [3, 0, 4],
            //left left    left
            [3, 4, 2], [1, 2, 4]
        ]

        this.colors = [
            vec4(0.0, 0.0, 0.0, 1.0),
            vec4(0.0, 0.6, 0.2, 1.0),
            vec4(0.0, 0.0, 0.0, 1.0)
        ]
    }
}

class Tree {
    constructor(initialLength, thickness, leafSize, limit, ax, az, bx, bz, cx, cz, m2, m3, k1, k2, k3) {
        this.initialLength = initialLength;
        this.limit = limit;
        this.thickness = thickness;
        this.leafSize = leafSize;
        this.ax = ax;
        this.az = az;
        this.bx = bx;
        this.bz = bz;
        this.cx = cx;
        this.cz = cz;
        this.m2 = m2;
        this.m3 = m3;
        this.k1 = k1;
        this.k2 = k2;
        this.k3 = k3;
    }


    // calculates the product of transformation matrices: Previous Matrix(T(Rz(Rx)))
    transform(matrix, angleX, angleZ, translateX, translateY, translateZ) {
        // Rz*Rx
        let mtx1 = mult(rotateZ(angleX), rotateX(angleZ));
        // T*(Rz*Rx)
        let mtx = mult(translate(translateX, translateY, translateZ), mtx1);
        // the result of Previous matrix * (T*(Rz*Rx))
        return mult(matrix, mtx);
    }

    generateTree(matrix, branch, level, branches, leaves) {
        if (level == this.limit) {
            let leaf = new Leaf(this.leafSize);
            for (let i = 0; i < leaf.vertices.length; i++) {
                leaf.vertices[i] = mult(mult(matrix, translate(0, 0, branch.height)), leaf.vertices[i]);
            }
            // fill in the array of leaves
            leaves.push(leaf);
            return;
        }
        if (level == 0) {
            level++;
            branches.push(branch);
            this.generateTree(matrix, branches[0], level, branches, leaves);
        }
        else {
            level++;

            let subBranchA = new Branch(branch.thickness * this.k1, branch.height * this.k1);
            let subBranchB = new Branch(branch.thickness * this.k2, branch.height * this.k2);
            let subBranchC = new Branch(branch.thickness * this.k3, branch.height * this.k3);

            // updated T(Rz(Rx))
            let matrixA = this.transform(matrix, this.ax, this.az, 0, 0, branch.height);
            let matrixB = this.transform(matrix, this.bx, this.bz, 0, 0, this.m2 * branch.height);
            let matrixC = this.transform(matrix, this.cx, this.cz, 0, 0, this.m3 * branch.height);

            for (let j = 0; j < subBranchA.vertices.length; j++) {
                subBranchA.vertices[j] = mult(matrixA, subBranchA.vertices[j]);
                subBranchB.vertices[j] = mult(matrixB, subBranchB.vertices[j]);
                subBranchC.vertices[j] = mult(matrixC, subBranchC.vertices[j]);
            }

            branches.push(subBranchA, subBranchB, subBranchC);

            this.generateTree(matrixA, subBranchA, level, branches, leaves);
            this.generateTree(matrixB, subBranchB, level, branches, leaves);
            this.generateTree(matrixC, subBranchC, level, branches, leaves);
        }
    }
}


//!REFERENCES:
//The code review of week 10
//Ayan Hashimova's HW-2
//https://webglfundamentals.org/webgl/lessons/webgl-3d-lighting-point.html
//https://webglfundamentals.org/webgl/lessons/webgl-3d-lighting-directional.html
//https://webglfundamentals.org/webgl/lessons/webgl-shaders-and-glsl.html
//https://webglfundamentals.org/webgl/lessons/webgl-3d-lighting-point.html
//https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Creating_3D_objects_using_WebGL
//https://www.youtube.com/playlist?list=PLAwxTw4SYaPlaHwnoGxJE7NFhEWRCIyet
//https://www.youtube.com/playlist?list=PLPbmjY2NVO_X1U1JzLxLDdRn4NmtxyQQo
//https://www.youtube.com/watch?v=FD9g67Rf67s
//https://www.youtube.com/watch?v=Hc2eHJUOEBE
//https://www.youtube.com/watch?v=8XOctnNrJn4
//https://www.youtube.com/watch?v=s6xGZy2FIMo
//https://www.youtube.com/watch?v=EcLagI5JWHs