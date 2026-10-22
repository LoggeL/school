# Blender solenoid apparatus

Authored and rendered with Blender 5.2.1 LTS. No external assets or texture downloads.

## Files

- `create_solenoid.py`: complete procedural Blender scene source.
- `solenoid-apparatus-v2.blend`: editable model, insertion action, studio lighting and camera.
- `solenoid-preview-v2.png`: rendered material and geometry preview.
- `../site/assets/models/solenoid-v2.glb`: web asset, only model geometry and animation; no studio objects.
- `solenoid-validation.json`: export size, triangle count and validation summary.

Rebuild with `blender --background --python art-source/create_solenoid.py` from the repository root. The command writes the GLB, saves the Blender project, and renders the preview.

## Renderer contract

The solenoid axis is X. glTF exports Y-up, so ordinary Three.js GLTFLoader orientation is correct.

- `Coil`: 12 symbolic windings for the initial N = 400 example; centerline radius 0.73, wire radius 0.055, X span [-2.1, 2.1]. Hide it and replace with a procedural helix for variable winding count.
- `IronCoreAssembly`: moving empty parent of `IronCore`, `CoreEdgeLeft`, `CoreEdgeRight`. The iron rod has radius 0.45 and length 5.1. Default exported X position is 5.8 (first animation key), so set it explicitly before calculating scene bounds or displaying the inserted state.
- `InsertCore`: native Blender action exported as glTF animation, moving `IronCoreAssembly` from X = 5.8 to X = 0 over 44 / 24 seconds. The app may instead interpolate this same parent directly to honor its pause/reduced-motion state.
- `Bobbin`: hollow ceramic winding former, outer radius 0.655, inner radius 0.51.
- `FlangeLeft`, `FlangeRight`: ceramic ends with outer radius 0.83, open at the center.
- `Base`: width 5.9, depth 1.65, top Y = -1.05. Rubber feet reach Y = -1.35.
- `SupportLeft`, `SupportRight`, binding-post assemblies and `LeadLeft`/`LeadRight` complete the apparatus.

The model represents a classroom apparatus. Its visible winding count is symbolic and not the actual count of the example coil. No magnetic field is baked into the GLB; the renderer supplies the correctly directed schematic field and its controls.

Materials use standard glTF metallic/roughness. A studio environment or fill lighting is recommended for copper and iron. The asset has no texture dependencies.
