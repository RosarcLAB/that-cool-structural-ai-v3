# System Architecture Diagram: Interactive 3D Modeling

## Component Hierarchy

```
App.tsx (Root)
    ├── ProjectsDrawer
    │   └── [Project List]
    │
    └── ProjectModel (3D Viewer)
        │
        ├── Header
        │   ├── Project Name
        │   └── Element Count
        │
        ├── Toolbar
        │   ├── [Draw Line] Button
        │   ├── [Cancel] Button (conditional)
        │   └── [Deselect] Button (conditional)
        │
        ├── Canvas (React Three Fiber)
        │   │
        │   ├── Lighting
        │   │   ├── Ambient Light
        │   │   ├── Directional Light (with shadows)
        │   │   └── Point Light
        │   │
        │   ├── Environment (city preset)
        │   │
        │   ├── Grid (20x20, 1m cells)
        │   │
        │   ├── DrawingPlane (invisible click detector)
        │   │
        │   ├── DrawingPreview (conditional, when drawing)
        │   │   ├── Dashed Line
        │   │   ├── Start Point Sphere
        │   │   └── End Point Sphere
        │   │
        │   ├── StructuralElement3D (for each element)
        │   │   ├── Main Mesh (box geometry)
        │   │   ├── Selection Outline (conditional, when selected)
        │   │   ├── Node Spheres (x2, at ends)
        │   │   ├── Support Indicators (for each support)
        │   │   │   ├── Support Sphere
        │   │   │   └── Support Cone (direction)
        │   │   └── Text Labels
        │   │       ├── Element Name
        │   │       └── Section Name
        │   │
        │   └── OrbitControls (camera navigation)
        │
        ├── Footer (controls info)
        │
        ├── ContextMenu3D (conditional, on right-click)
        │   ├── [Edit Element] Button
        │   ├── [Duplicate] Button
        │   └── [Delete] Button
        │
        └── ElementEditPanel (conditional, when editing)
            ├── Header (with close button)
            ├── Basic Info Section
            ├── Position & Orientation Section
            ├── Section Info Section
            ├── Supports Summary
            ├── Loads Summary
            └── Footer Actions
                ├── [Save Changes] Button
                ├── [Delete] Button
                └── [Cancel] Button
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                             │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐
              │   Click   │ │Right-  │ │  Draw    │
              │  Element  │ │Click   │ │  Line    │
              └─────┬─────┘ └───┬────┘ └────┬─────┘
                    │           │            │
                    │           │            │
┌───────────────────┼───────────┼────────────┼─────────────────────┐
│                   │           │            │                      │
│  ProjectModel Component (Local State)                            │
│                   │           │            │                      │
│  ┌────────────────▼─────┐    │    ┌───────▼──────────┐          │
│  │ selectedElement      │    │    │  drawingState    │          │
│  │ (Element | null)     │    │    │  - isDrawing     │          │
│  └────────────────┬─────┘    │    │  - startPoint    │          │
│                   │           │    │  - currentPoint  │          │
│  ┌────────────────▼─────┐    │    │  - previewLine   │          │
│  │ isEditPanelOpen      │    │    └──────────────────┘          │
│  │ (boolean)            │    │                                   │
│  └──────────────────────┘    │                                   │
│                               │                                   │
│  ┌────────────────────────────▼──────────┐                       │
│  │ contextMenu                           │                       │
│  │  - isOpen: boolean                    │                       │
│  │  - position: { x, y }                 │                       │
│  │  - element: Element | null            │                       │
│  └───────────────────────────────────────┘                       │
│                                                                   │
│  ┌────────────────────────────────────────────────┐              │
│  │ localProject (working copy)                    │              │
│  │  - id                                          │              │
│  │  - name                                        │              │
│  │  - elements: Element[]                         │              │
│  │      ├── id                                    │              │
│  │      ├── name                                  │              │
│  │      ├── type                                  │              │
│  │      ├── span                                  │              │
│  │      ├── position?: [x, y, z]                 │              │
│  │      ├── rotation?: degrees                   │              │
│  │      ├── sections: SectionProperties[]        │              │
│  │      ├── supports: Support[]                  │              │
│  │      └── appliedLoads: AppliedLoads[]         │              │
│  └────────────────────────────────────────────────┘              │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  onUpdateProject()     │
                    │  (callback to parent)  │
                    └───────────┬────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                                                                    │
│  App.tsx Component (Global State)                                 │
│                                                                    │
│  ┌────────────────────────────────────────────────┐               │
│  │ projects: Project[]                            │               │
│  │  (source of truth)                             │               │
│  └────────────────────────────────────────────────┘               │
│                                                                    │
│  ┌────────────────────────────────────────────────┐               │
│  │ selectedProject: Project | null                │               │
│  │  (synchronized with projects array)            │               │
│  └────────────────────────────────────────────────┘               │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                 ┌───────────▼────────────┐
                 │  isFirebaseConfigured  │
                 │  & user authenticated? │
                 └───────────┬────────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                ┌───▼───┐          ┌──▼───┐
                │  YES  │          │  NO  │
                └───┬───┘          └──┬───┘
                    │                 │
        ┌───────────▼──────────┐      │
        │ projectService       │      │
        │ .updateProject()     │      │
        │                      │      │
        │ ┌──────────────────┐ │      │
        │ │ Save to Firebase │ │      │
        │ │ (async)          │ │      │
        │ └──────────────────┘ │      │
        └──────────────────────┘      │
                    │                 │
                    └────────┬────────┘
                             │
                    ┌────────▼─────────┐
                    │ Update Complete  │
                    │ 3D View Re-render│
                    └──────────────────┘
```

---

## Event Flow: Drawing a Line

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User Clicks "Draw Line" Button                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │ toggleDrawingMode() │
                └──────────┬──────────┘
                           │
            ┌──────────────▼──────────────┐
            │ isDrawingMode = true         │
            │ OrbitControls disabled       │
            │ UI updates (button highlight)│
            └──────────────┬──────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Step 2: User Clicks on Ground (First Point)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │ handlePlaneClick()  │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │ startDrawing(point) │
                └──────────┬──────────┘
                           │
            ┌──────────────▼──────────────┐
            │ drawingState.isDrawing = true│
            │ drawingState.startPoint = pt │
            │ Green sphere appears         │
            └──────────────┬──────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Step 3: User Moves Mouse                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │ handlePlaneMove()   │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │ updateDrawing(point)│
                └──────────┬──────────┘
                           │
            ┌──────────────▼──────────────┐
            │ drawingState.previewLine    │
            │   = { start, end }          │
            │ Dashed line previews        │
            └──────────────┬──────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Step 4: User Clicks Again (Second Point)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │ handlePlaneClick()  │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │ finishDrawing(point)│
                └──────────┬──────────┘
                           │
            ┌──────────────▼──────────────────┐
            │ Returns { start, end }          │
            │ Clears drawing state            │
            └──────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │ createElementFromLine(start, end)   │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │ Calculate:                           │
        │  - span = start.distanceTo(end)     │
        │  - midPoint = (start + end) / 2     │
        │  - angle = atan2(dir.z, dir.x)      │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │ Create newElement:                   │
        │  - id: `element-${timestamp}`       │
        │  - name: "Element [N]"              │
        │  - type: "Beam"                     │
        │  - span: calculated                 │
        │  - position: midPoint               │
        │  - rotation: angle                  │
        │  - sections: default LVL            │
        │  - supports: 2 pinned               │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │ updatedProject = {                   │
        │   ...localProject,                  │
        │   elements: [...elements, newElem]  │
        │ }                                    │
        └──────────────────┬──────────────────┘
                           │
                ┌──────────▼──────────┐
                │ setLocalProject()   │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │ onUpdateProject()   │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │ toggleDrawingMode() │
                │ (exit drawing mode) │
                └──────────┬──────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │ 3D View Re-renders                   │
        │ New element appears!                 │
        └──────────────────────────────────────┘
```

---

## Event Flow: Right-Click Context Menu

```
User Right-Clicks on Element
        │
        ▼
StructuralElement3D.onContextMenu
        │
        ├─► event.stopPropagation()
        └─► handleElementContextMenu(element, event)
                │
                ▼
        setContextMenu({
          isOpen: true,
          position: { x: clientX, y: clientY },
          element: element
        })
                │
                ▼
        ContextMenu3D renders at cursor
                │
        ┌───────┼───────┐
        │       │       │
        ▼       ▼       ▼
     [Edit] [Duplicate] [Delete]
        │       │       │
        └───────┴───────┴─► User clicks option
                │
        ┌───────┼────────────┐
        │       │            │
   handleEdit  handleDuplicate  handleDelete
        │       │            │
        ▼       ▼            ▼
  Open Panel  Create Copy  Confirm & Remove
        │       │            │
        └───────┴────────────┴─► onClose()
                │
                ▼
        ContextMenu closes
```

---

## State Synchronization Pattern

```
┌──────────────────────────────────────────────────────────────┐
│                  SYNCHRONIZATION CYCLE                        │
└──────────────────────────────────────────────────────────────┘

Local State (ProjectModel)
    │
    ├─► User edits element in Edit Panel
    │       │
    │       ▼
    │   setLocalProject({ ...project, elements: updated })
    │       │
    │       ▼
    │   onUpdateProject(updatedProject)  ◄─── Callback to parent
    │       │
    │       ▼
    └─► App.tsx receives update
            │
            ├─► setProjects(prev => prev.map(p => ...))
            │       │
            │       └─► Global projects array updated
            │
            ├─► setSelectedProject(updatedProject)
            │       │
            │       └─► Selected project synced
            │
            └─► projectService.updateProject()  (if Firebase)
                    │
                    └─► Cloud persistence
                            │
                            ▼
                    ProjectModel re-renders
                            │
                            ▼
                    useEffect detects project change
                            │
                            ▼
                    setLocalProject(project)
                            │
                            └─► Sync complete! ✅
```

---

## 3D Rendering Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                   RENDERING PIPELINE                          │
└──────────────────────────────────────────────────────────────┘

React Component Tree
    │
    ├─► ProjectModel
    │       │
    │       ├─► Canvas (R3F)
    │       │       │
    │       │       ├─► Lights (ambient, directional, point)
    │       │       │       │
    │       │       │       └─► Shadow mapping enabled
    │       │       │
    │       │       ├─► Environment (city preset)
    │       │       │       │
    │       │       │       └─► IBL textures loaded
    │       │       │
    │       │       ├─► Grid (20x20 plane)
    │       │       │       │
    │       │       │       └─► Rendered to ground plane
    │       │       │
    │       │       └─► Elements (via map)
    │       │               │
    │       │               ├─► StructuralElement3D (1)
    │       │               ├─► StructuralElement3D (2)
    │       │               └─► StructuralElement3D (N)
    │       │                       │
    │       │                       ├─► BoxGeometry (main mesh)
    │       │                       │       │
    │       │                       │       └─► MeshStandardMaterial
    │       │                       │
    │       │                       ├─► Selection Outline (conditional)
    │       │                       │
    │       │                       ├─► Node Spheres (x2)
    │       │                       │       │
    │       │                       │       └─► SphereGeometry + Material
    │       │                       │
    │       │                       ├─► Support Indicators
    │       │                       │       │
    │       │                       │       ├─► Support Sphere
    │       │                       │       └─► Support Cone
    │       │                       │
    │       │                       └─► Text Labels
    │       │                               │
    │       │                               ├─► Element Name
    │       │                               └─► Section Name
    │       │
    │       └─► OrbitControls
    │               │
    │               └─► Camera manipulation
    │
    └─► DOM Overlays (React)
            │
            ├─► Header
            ├─► Toolbar
            ├─► Footer
            ├─► ContextMenu3D (conditional)
            └─► ElementEditPanel (conditional)

Final Output:
    ▼
┌────────────────────────────────────────┐
│  GPU renders WebGL scene               │
│  ├─► Shadow pass                       │
│  ├─► Color pass                        │
│  ├─► Post-processing (if any)          │
│  └─► Composited to canvas              │
└────────────────────────────────────────┘
    │
    ▼
Display on Screen! 🖥️
```

---

## Interaction Detection Flow

```
User Clicks on 3D Element
    │
    ▼
Three.js Raycasting
    │
    ├─► Cast ray from camera through cursor
    │
    ├─► Check intersection with all meshes
    │
    └─► Find closest intersected object
            │
            ├─► No intersection
            │       │
            │       └─► onPointerMissed (deselect)
            │
            └─► Intersection found
                    │
                    ├─► Get mesh userData/props
                    │
                    ├─► Trigger mesh.onClick
                    │
                    └─► Bubble up to StructuralElement3D
                            │
                            ├─► stopPropagation()
                            │
                            └─► onSelect(element)
                                    │
                                    └─► setSelectedElement(element)
```

---

**This diagram shows the complete architecture of your interactive 3D system!** 🎉

Save this for reference when extending functionality or debugging issues.
